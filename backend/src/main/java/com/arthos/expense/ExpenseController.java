package com.arthos.expense;

import com.arthos.auth.CurrentUser;
import com.arthos.automation.CategoryLearner;
import com.arthos.common.ApiException;
import com.arthos.common.MonthKey;
import com.arthos.expense.ExpenseDtos.ExpenseRequest;
import com.arthos.expense.ExpenseDtos.ExpenseResponse;
import com.arthos.user.UserContext;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseRepository expenses;
    private final MongoTemplate mongo;
    private final UserContext userCtx;
    private final CategoryLearner learner;

    public ExpenseController(ExpenseRepository expenses, MongoTemplate mongo, UserContext userCtx, CategoryLearner learner) {
        this.expenses = expenses;
        this.mongo = mongo;
        this.userCtx = userCtx;
        this.learner = learner;
    }

    /**
     * Lists the month's expenses ("YYYY-MM", default current month) with optional filters:
     * category, free-text search over merchant/note, and an amount range.
     */
    @GetMapping
    List<ExpenseResponse> list(@RequestParam(required = false) String month,
                               @RequestParam(required = false) ExpenseCategory category,
                               @RequestParam(required = false) String q,
                               @RequestParam(required = false) BigDecimal minAmount,
                               @RequestParam(required = false) BigDecimal maxAmount) {
        String userId = CurrentUser.id();
        String key = MonthKey.parseOrCurrent(month, userCtx.zone(userId)).toString();

        Criteria c = Criteria.where("userId").is(userId).and("monthKey").is(key);
        if (category != null) c = c.and("category").is(category);
        if (minAmount != null || maxAmount != null) {
            Criteria amt = c.and("amount");
            if (minAmount != null) amt = amt.gte(minAmount);
            if (maxAmount != null) amt = amt.lte(maxAmount);
        }
        if (q != null && !q.isBlank()) {
            Pattern p = Pattern.compile(Pattern.quote(q.trim()), Pattern.CASE_INSENSITIVE);
            c = c.orOperator(Criteria.where("merchant").regex(p), Criteria.where("note").regex(p));
        }
        Query query = Query.query(c).with(Sort.by(Sort.Order.desc("date"), Sort.Order.desc("createdAt")));
        return mongo.find(query, Expense.class).stream().map(ExpenseResponse::from).toList();
    }

    @GetMapping("/{id}")
    ExpenseResponse get(@PathVariable String id) {
        return ExpenseResponse.from(load(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ExpenseResponse create(@Valid @RequestBody ExpenseRequest req) {
        Expense e = new Expense();
        e.setUserId(CurrentUser.id());
        e.setExpiresAt(userCtx.demoExpiry(e.getUserId()));
        apply(e, req);
        Expense saved = expenses.save(e);
        learn(saved);
        return ExpenseResponse.from(saved);
    }

    @PutMapping("/{id}")
    ExpenseResponse update(@PathVariable String id, @Valid @RequestBody ExpenseRequest req) {
        Expense e = load(id);
        apply(e, req);
        Expense saved = expenses.save(e);
        learn(saved); // a changed category is a correction: remembered for this merchant from now on
        return ExpenseResponse.from(saved);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable String id) {
        expenses.delete(load(id));
    }

    private void learn(Expense e) {
        if (e.getMerchant() != null) learner.learn(e.getUserId(), e.getMerchant(), e.getCategory(), userCtx.demoExpiry(e.getUserId()));
    }

    private Expense load(String id) {
        return expenses.findByIdAndUserId(id, CurrentUser.id()).orElseThrow(() -> ApiException.notFound("Expense"));
    }

    private static void apply(Expense e, ExpenseRequest req) {
        e.setAmount(req.amount());
        e.setCategory(req.category());
        e.setMerchant(blankToNull(req.merchant()));
        e.setPaymentSource(req.paymentSource());
        e.setDate(req.date());
        e.setMonthKey(MonthKey.of(req.date()));
        e.setNote(blankToNull(req.note()));
        e.setRecurring(req.recurring());
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
