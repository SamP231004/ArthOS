package com.arthos.automation;

import com.arthos.auth.CurrentUser;
import com.arthos.automation.RecurringDetector.Candidate;
import com.arthos.automation.RecurringDetector.Entry;
import com.arthos.automation.TransactionTextParser.Parsed;
import com.arthos.common.ApiException;
import com.arthos.expense.Expense;
import com.arthos.expense.ExpenseCategory;
import com.arthos.expense.ExpenseRepository;
import com.arthos.expense.PaymentSource;
import com.arthos.income.Income;
import com.arthos.income.IncomeRepository;
import com.arthos.income.IncomeType;
import com.arthos.user.UserContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * Phase 4 automation (blueprint §10, §11, §16): turning OCR text into a draft transaction, smart categories that
 * learn from the user, and automatic recurring detection. OCR itself runs on the device (ML Kit on Android,
 * Tesseract in the browser), so images never reach the server — only the extracted text does.
 */
@RestController
@RequestMapping("/api/automation")
public class AutomationController {

    /** How many months (including the current one) recurring detection looks at. */
    private static final int WINDOW = 4;

    public record ParseRequest(@NotBlank @Size(max = 20_000) String text) {}

    public record ParseResponse(String kind, BigDecimal amount, LocalDate date, String merchant, String reference,
                                PaymentSource paymentSource, ExpenseCategory category, IncomeType incomeType,
                                String categorySource, double confidence, List<String> found, boolean usable) {}

    public record CategoryResponse(ExpenseCategory category, String source) {}

    public record RecurringView(String kind, String key, String name, String tag, BigDecimal typicalAmount, int months,
                                LocalDate lastDate, int dayOfMonth) {}

    public record MarkRequest(@NotNull RecurringDetector.Kind kind, @NotBlank @Size(max = 80) String key) {}

    public record MarkResponse(int updated) {}

    private final CategoryLearner learner;
    private final ExpenseRepository expenses;
    private final IncomeRepository incomes;
    private final UserContext userCtx;

    public AutomationController(CategoryLearner learner, ExpenseRepository expenses, IncomeRepository incomes, UserContext userCtx) {
        this.learner = learner;
        this.expenses = expenses;
        this.incomes = incomes;
        this.userCtx = userCtx;
    }

    /** Draft a transaction from text read off a screenshot, SMS or receipt; the client confirms before saving. */
    @PostMapping("/parse")
    ParseResponse parse(@Valid @RequestBody ParseRequest req) {
        String userId = CurrentUser.id();
        LocalDate today = LocalDate.now(userCtx.zone(userId));
        Parsed p = TransactionTextParser.parse(req.text(), today);
        if (p.kind() == TransactionTextParser.Kind.INCOME) {
            IncomeType type = CategoryRules.income(p.merchant(), req.text()).orElse(IncomeType.OTHER);
            return new ParseResponse("INCOME", p.amount(), p.date(), p.merchant(), p.reference(), p.paymentSource(), null, type,
                    type == IncomeType.OTHER ? "NONE" : "BUILT_IN", p.confidence(), p.found(), TransactionTextParser.usable(p).isPresent());
        }
        CategoryLearner.Suggestion s = learner.suggest(userId, p.merchant(), req.text());
        return new ParseResponse("EXPENSE", p.amount(), p.date(), p.merchant(), p.reference(), p.paymentSource(), s.category(), null,
                s.source().name(), p.confidence(), p.found(), TransactionTextParser.usable(p).isPresent());
    }

    /** Smart category for a merchant as the user types it (learned from them first, then built-in knowledge). */
    @GetMapping("/category")
    CategoryResponse category(@RequestParam @Size(max = 120) String merchant) {
        CategoryLearner.Suggestion s = learner.suggest(CurrentUser.id(), merchant, "");
        return new CategoryResponse(s.category(), s.source().name());
    }

    /** Bills and income that repeat every month but aren't marked recurring yet. */
    @GetMapping("/recurring")
    List<RecurringView> recurring() {
        String userId = CurrentUser.id();
        List<Entry> entries = recent(userId, userCtx.zone(userId));
        return RecurringDetector.detect(entries).stream().map(AutomationController::view).toList();
    }

    /** Mark every recent entry of a detected group as recurring (so it's also offered for re-logging next month). */
    @PostMapping("/recurring")
    MarkResponse mark(@Valid @RequestBody MarkRequest req) {
        String userId = CurrentUser.id();
        List<String> months = months(userCtx.zone(userId));
        int n = 0;
        if (req.kind() == RecurringDetector.Kind.EXPENSE) {
            List<Expense> hit = expenses.findByUserIdAndMonthKeyIn(userId, months).stream()
                    .filter(e -> !e.isRecurring() && MerchantKey.of(name(e)).equals(req.key())).toList();
            hit.forEach(e -> e.setRecurring(true));
            expenses.saveAll(hit);
            n = hit.size();
        } else {
            List<Income> hit = incomes.findByUserIdAndMonthKeyIn(userId, months).stream()
                    .filter(i -> !i.isRecurring() && MerchantKey.of(i.getSource()).equals(req.key())).toList();
            hit.forEach(i -> i.setRecurring(true));
            incomes.saveAll(hit);
            n = hit.size();
        }
        if (n == 0) throw ApiException.notFound("Matching transactions");
        return new MarkResponse(n);
    }

    // ------------------------------------------------------------------

    private List<Entry> recent(String userId, ZoneId zone) {
        List<String> months = months(zone);
        List<Entry> out = new ArrayList<>();
        for (Expense e : expenses.findByUserIdAndMonthKeyIn(userId, months))
            out.add(new Entry(e.getId(), RecurringDetector.Kind.EXPENSE, name(e), e.getCategory() == null ? null : e.getCategory().name(), e.getAmount(), e.getDate(), e.isRecurring()));
        for (Income i : incomes.findByUserIdAndMonthKeyIn(userId, months))
            out.add(new Entry(i.getId(), RecurringDetector.Kind.INCOME, i.getSource(), i.getType() == null ? null : i.getType().name(), i.getAmount(), i.getDate(), i.isRecurring()));
        return out;
    }

    private static List<String> months(ZoneId zone) {
        YearMonth now = YearMonth.now(zone);
        List<String> keys = new ArrayList<>();
        for (int i = 0; i < WINDOW; i++) keys.add(now.minusMonths(i).toString());
        return keys;
    }

    /** Expenses without a merchant are grouped by category name, as they're shown in the app. */
    private static String name(Expense e) {
        return e.getMerchant() != null ? e.getMerchant() : e.getCategory() == null ? "" : e.getCategory().name();
    }

    private static RecurringView view(Candidate c) {
        return new RecurringView(c.kind().name(), c.key(), c.name(), c.tag(), c.typicalAmount(), c.months(), c.lastDate(), c.dayOfMonth());
    }
}
