package com.arthos.budget;

import com.arthos.auth.CurrentUser;
import com.arthos.common.MonthKey;
import com.arthos.expense.ExpenseCategory;
import com.arthos.expense.ExpenseRepository;
import com.arthos.user.UserContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

/**
 * Budget engine API. A month without its own budget inherits the latest earlier one, so a budget set once keeps
 * working month after month until the user changes it.
 */
@RestController
@RequestMapping("/api/budget")
public class BudgetController {

    public static final List<ExpenseCategory> DEFAULT_EXCLUDED = List.of(ExpenseCategory.RENT, ExpenseCategory.EMI);

    public record BudgetRequest(
            @NotNull @DecimalMin(value = "1", message = "must be at least 1") @Digits(integer = 13, fraction = 2) BigDecimal limit,
            @NotNull BudgetMode mode,
            @Size(max = 15) List<ExpenseCategory> excludedCategories) {}

    private final BudgetRepository budgets;
    private final ExpenseRepository expenses;
    private final UserContext userCtx;

    public BudgetController(BudgetRepository budgets, ExpenseRepository expenses, UserContext userCtx) {
        this.budgets = budgets;
        this.expenses = expenses;
        this.userCtx = userCtx;
    }

    @GetMapping
    BudgetStatus get(@RequestParam(required = false) String month) {
        String userId = CurrentUser.id();
        ZoneId zone = userCtx.zone(userId);
        YearMonth ym = MonthKey.parseOrCurrent(month, zone);
        return status(userId, ym, zone);
    }

    /** Creates or replaces the budget for a month (and, by inheritance, for the months after it). */
    @PutMapping
    BudgetStatus put(@RequestParam(required = false) String month, @Valid @RequestBody BudgetRequest req) {
        String userId = CurrentUser.id();
        ZoneId zone = userCtx.zone(userId);
        YearMonth ym = MonthKey.parseOrCurrent(month, zone);

        Budget b = budgets.findByUserIdAndMonthKey(userId, ym.toString()).orElseGet(Budget::new);
        b.setUserId(userId);
        b.setMonthKey(ym.toString());
        b.setLimit(req.limit());
        b.setMode(req.mode());
        b.setExcludedCategories(req.excludedCategories() == null ? DEFAULT_EXCLUDED : List.copyOf(req.excludedCategories()));
        b.setExpiresAt(userCtx.demoExpiry(userId));
        try {
            budgets.save(b);
        } catch (DuplicateKeyException e) {
            // concurrent first save for the same month: retry as an update
            Budget existing = budgets.findByUserIdAndMonthKey(userId, ym.toString()).orElseThrow();
            existing.setLimit(b.getLimit());
            existing.setMode(b.getMode());
            existing.setExcludedCategories(b.getExcludedCategories());
            budgets.save(existing);
        }
        return status(userId, ym, zone);
    }

    /** Removes this month's own budget; the month falls back to inheriting from earlier months, if any. */
    @DeleteMapping
    @ResponseStatus(HttpStatus.OK)
    BudgetStatus delete(@RequestParam(required = false) String month) {
        String userId = CurrentUser.id();
        ZoneId zone = userCtx.zone(userId);
        YearMonth ym = MonthKey.parseOrCurrent(month, zone);
        budgets.deleteByUserIdAndMonthKey(userId, ym.toString());
        return status(userId, ym, zone);
    }

    private BudgetStatus status(String userId, YearMonth ym, ZoneId zone) {
        String key = ym.toString();
        Optional<Budget> own = budgets.findByUserIdAndMonthKey(userId, key);
        Optional<Budget> budget = own.isPresent() ? own : budgets.findFirstByUserIdAndMonthKeyLessThanOrderByMonthKeyDesc(userId, key);
        if (budget.isEmpty()) return BudgetStatus.notConfigured(key);
        Budget b = budget.get();
        return BudgetCalculator.calculate(ym, LocalDate.now(zone), b.getLimit(), b.getMode(), b.getExcludedCategories(),
                expenses.findByUserIdAndMonthKeyOrderByDateDescCreatedAtDesc(userId, key),
                own.isPresent() ? null : b.getMonthKey());
    }
}
