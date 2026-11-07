package com.arthos.summary;

import com.arthos.auth.CurrentUser;
import com.arthos.common.ApiException;
import com.arthos.common.MonthKey;
import com.arthos.common.Parallel;
import com.arthos.income.Income;
import com.arthos.portfolio.HoldingRepository;
import com.arthos.expense.ExpenseRepository;
import com.arthos.income.IncomeRepository;
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

@RestController
@RequestMapping("/api/summary")
public class SummaryController {

    private final UserRepository users;
    private final IncomeRepository incomes;
    private final ExpenseRepository expenses;
    private final HoldingRepository holdings;

    public SummaryController(UserRepository users, IncomeRepository incomes, ExpenseRepository expenses, HoldingRepository holdings) {
        this.users = users;
        this.incomes = incomes;
        this.expenses = expenses;
        this.holdings = holdings;
    }

    /** Month summary for the dashboard. {@code month} is "YYYY-MM"; defaults to the current month. */
    @GetMapping
    MonthSummary month(@RequestParam(required = false) String month) {
        User user = users.findById(CurrentUser.id()).orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
        ZoneId zone = MonthKey.zoneOrDefault(user.getTimezone());
        YearMonth ym = MonthKey.parseOrCurrent(month, zone);
        String key = ym.toString(), uid = user.getId();
        // independent reads, all at once
        var allIncomesF = Parallel.async(() -> incomes.findByUserId(uid));
        var holdingsF = Parallel.async(() -> holdings.findByUserIdOrderByCreatedAtAsc(uid));
        var expensesF = Parallel.async(() -> expenses.findByUserIdAndMonthKeyOrderByDateDescCreatedAtDesc(uid, key));
        var allIncomes = Parallel.get(allIncomesF);
        var monthIncomes = allIncomes.stream().filter(i -> key.equals(i.getMonthKey()))
                .sorted(java.util.Comparator.comparing(Income::getDate, java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder()))
                        .thenComparing(Income::getCreatedAt, java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
                .toList();
        return MonthSummaryCalculator.calculate(
                ym, LocalDate.now(zone), user.getCurrency(), user.getMonthlyIncomeTarget(), user.savingsRule(),
                SavingsService.account(user, ym, allIncomes, Parallel.get(holdingsF)),
                monthIncomes, Parallel.get(expensesF));
    }
}
