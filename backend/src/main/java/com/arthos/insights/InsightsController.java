package com.arthos.insights;

import com.arthos.auth.CurrentUser;
import com.arthos.budget.Budget;
import com.arthos.budget.BudgetCalculator;
import com.arthos.budget.BudgetRepository;
import com.arthos.budget.BudgetStatus;
import com.arthos.common.ApiException;
import com.arthos.common.MonthKey;
import com.arthos.common.Parallel;
import com.arthos.expense.Expense;
import com.arthos.expense.ExpenseRepository;
import com.arthos.income.IncomeRepository;
import com.arthos.portfolio.Holding;
import com.arthos.portfolio.HoldingRepository;
import com.arthos.savings.SavingsService;
import com.arthos.user.User;
import com.arthos.user.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Phase 5: the month's insights — summary, trends, anomalies, recurring leakage, health score, alerts, suggestions. */
@RestController
@RequestMapping("/api/insights")
public class InsightsController {

    private final UserRepository users;
    private final ExpenseRepository expenses;
    private final IncomeRepository incomes;
    private final BudgetRepository budgets;
    private final HoldingRepository holdings;
    private final SavingsService savings;

    public InsightsController(UserRepository users, ExpenseRepository expenses, IncomeRepository incomes, BudgetRepository budgets,
                              HoldingRepository holdings, SavingsService savings) {
        this.users = users;
        this.expenses = expenses;
        this.incomes = incomes;
        this.budgets = budgets;
        this.holdings = holdings;
        this.savings = savings;
    }

    @GetMapping
    InsightsCalculator.Report insights(@RequestParam(required = false) String month) {
        User user = users.findById(CurrentUser.id()).orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
        ZoneId zone = MonthKey.zoneOrDefault(user.getTimezone());
        YearMonth ym = MonthKey.parseOrCurrent(month, zone);
        LocalDate today = LocalDate.now(zone);

        List<String> months = new ArrayList<>();
        for (int i = 0; i <= 3; i++) months.add(ym.minusMonths(i).toString());
        String uid = user.getId(), key = ym.toString();
        // independent reads, all at once (one database round trip instead of six)
        var exF = Parallel.async(() -> expenses.findByUserIdAndMonthKeyIn(uid, months));
        var allIncomesF = Parallel.async(() -> incomes.findByUserId(uid));
        var holdingsF = Parallel.async(() -> holdings.findByUserIdOrderByCreatedAtAsc(uid));
        var ownF = Parallel.async(() -> budgets.findByUserIdAndMonthKey(uid, key));
        var earlierF = Parallel.async(() -> budgets.findFirstByUserIdAndMonthKeyLessThanOrderByMonthKeyDesc(uid, key));

        List<Expense> ex = Parallel.get(exF);
        var allIncomes = Parallel.get(allIncomesF);
        var allHoldings = Parallel.get(holdingsF);
        var in = allIncomes.stream().filter(i -> months.contains(i.getMonthKey())).toList();

        List<LocalDate> buys = new ArrayList<>();
        for (Holding h : allHoldings)
            for (Holding.Lot l : h.getLots())
                if (l.getType() == Holding.LotType.BUY && l.getDate() != null) buys.add(l.getDate());

        return InsightsCalculator.calculate(new InsightsCalculator.Input(ym, today, user.getCurrency(), user.savingsRule(), ex, in,
                budget(ym, today, ex, Parallel.get(ownF), Parallel.get(earlierF)), SavingsService.account(user, ym, allIncomes, allHoldings), buys));
    }

    /** The month's own budget, or the latest earlier one it inherits (as the budget page does). */
    private static BudgetStatus budget(YearMonth ym, LocalDate today, List<Expense> ex, Optional<Budget> own, Optional<Budget> earlier) {
        String key = ym.toString();
        Optional<Budget> b = own.isPresent() ? own : earlier;
        if (b.isEmpty()) return BudgetStatus.notConfigured(key);
        List<Expense> monthOnly = ex.stream().filter(e -> key.equals(e.getMonthKey())).toList();
        return BudgetCalculator.calculate(ym, today, b.get().getLimit(), b.get().getMode(), b.get().getExcludedCategories(), monthOnly,
                own.isPresent() ? null : b.get().getMonthKey());
    }
}
