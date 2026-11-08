package com.arthos.widget;

import com.arthos.auth.CurrentUser;
import com.arthos.budget.Budget;
import com.arthos.budget.BudgetCalculator;
import com.arthos.budget.BudgetMode;
import com.arthos.budget.BudgetRepository;
import com.arthos.budget.BudgetStatus;
import com.arthos.common.ApiException;
import com.arthos.common.MonthKey;
import com.arthos.common.Parallel;
import com.arthos.expense.Expense;
import com.arthos.expense.ExpenseRepository;
import com.arthos.income.IncomeRepository;
import com.arthos.market.MarketDataService;
import com.arthos.portfolio.Holding;
import com.arthos.portfolio.HoldingRepository;
import com.arthos.portfolio.PortfolioCalculator;
import com.arthos.portfolio.PortfolioView;
import com.arthos.savings.SavingsService;
import com.arthos.summary.MonthSummary;
import com.arthos.summary.MonthSummaryCalculator;
import com.arthos.user.User;
import com.arthos.user.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Home-screen widgets (blueprint Phase 6): everything the Android widgets show, in one small response, so a widget
 * refresh is a single request. Built from the same calculators as the Budget, Overview and Investments screens, so
 * the widget can never disagree with the app.
 */
@RestController
@RequestMapping("/api/widget")
public class WidgetController {

    public record Snapshot(String month, String currency, LocalDate today, int dayOfMonth, int daysInMonth, BudgetPart budget,
                           MoneyPart money, PortfolioPart portfolio, Instant generatedAt) {}

    /** Safe-to-spend figures; everything but {@code configured} is null when no budget is set. */
    public record BudgetPart(boolean configured, BigDecimal todayRemaining, BigDecimal todayAllowance, BigDecimal spentToday,
                             BigDecimal spentMonth, BigDecimal limit, BigDecimal remainingMonth, BigDecimal usedPct,
                             BigDecimal elapsedPct, BudgetStatus.Status status, BudgetMode mode, int daysRemaining) {}

    public record MoneyPart(BigDecimal income, BigDecimal spent, BigDecimal savedFirst, BigDecimal spendable, BigDecimal leftToSpend,
                            /** leftToSpend spread over the days left (today included); null for a past month. */
                            BigDecimal perDayLeft, BigDecimal savingsBalance) {}

    /** Null when the user holds no investments. */
    public record PortfolioPart(BigDecimal value, BigDecimal invested, BigDecimal gain, BigDecimal gainPct,
                                BigDecimal dayChange, BigDecimal dayChangePct, int holdingsCount) {}

    private final UserRepository users;
    private final IncomeRepository incomes;
    private final ExpenseRepository expenses;
    private final BudgetRepository budgets;
    private final HoldingRepository holdings;
    private final MarketDataService market;

    public WidgetController(UserRepository users, IncomeRepository incomes, ExpenseRepository expenses, BudgetRepository budgets,
                            HoldingRepository holdings, MarketDataService market) {
        this.users = users;
        this.incomes = incomes;
        this.expenses = expenses;
        this.budgets = budgets;
        this.holdings = holdings;
        this.market = market;
    }

    @GetMapping
    Snapshot snapshot() {
        String uid = CurrentUser.id();
        User user = users.findById(uid).orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
        ZoneId zone = MonthKey.zoneOrDefault(user.getTimezone());
        LocalDate today = LocalDate.now(zone);
        YearMonth ym = YearMonth.from(today);
        String key = ym.toString();

        // independent reads, all at once
        var expensesF = Parallel.async(() -> expenses.findByUserIdAndMonthKeyOrderByDateDescCreatedAtDesc(uid, key));
        var allIncomesF = Parallel.async(() -> incomes.findByUserId(uid));
        var holdingsF = Parallel.async(() -> holdings.findByUserIdOrderByCreatedAtAsc(uid));
        var ownF = Parallel.async(() -> budgets.findByUserIdAndMonthKey(uid, key));
        var earlierF = Parallel.async(() -> budgets.findFirstByUserIdAndMonthKeyLessThanOrderByMonthKeyDesc(uid, key));

        List<Expense> monthExpenses = Parallel.get(expensesF);
        var allIncomes = Parallel.get(allIncomesF);
        List<Holding> allHoldings = Parallel.get(holdingsF);
        var monthIncomes = allIncomes.stream().filter(i -> key.equals(i.getMonthKey())).toList();

        MonthSummary s = MonthSummaryCalculator.calculate(ym, today, user.getCurrency(), user.getMonthlyIncomeTarget(), user.savingsRule(),
                SavingsService.account(user, ym, allIncomes, allHoldings), monthIncomes, monthExpenses);
        BudgetStatus b = budget(ym, today, monthExpenses, Parallel.get(ownF), Parallel.get(earlierF));

        int daysLeft = Math.max(1, ym.lengthOfMonth() - today.getDayOfMonth() + 1);
        BigDecimal perDay = s.leftToSpend() == null ? null
                : s.leftToSpend().max(BigDecimal.ZERO).divide(BigDecimal.valueOf(daysLeft), 0, RoundingMode.DOWN);
        MoneyPart money = new MoneyPart(s.totalIncome(), s.totalExpense(), s.savedFirst(), s.spendable(), s.leftToSpend(), perDay,
                s.savings() == null ? null : s.savings().closing());

        BudgetPart budget = b.configured()
                ? new BudgetPart(true, b.todayRemaining(), b.todayAllowance(), b.spentToday(), b.spentMonth(), b.limit(), b.remainingMonth(),
                        b.usedPct(), b.elapsedPct(), b.status(), b.mode(), b.daysRemaining())
                : new BudgetPart(false, null, null, null, null, null, null, null, null, null, null, daysLeft);

        return new Snapshot(key, user.getCurrency(), today, today.getDayOfMonth(), ym.lengthOfMonth(), budget, money,
                portfolio(allHoldings, today), Instant.now());
    }

    private static BudgetStatus budget(YearMonth ym, LocalDate today, List<Expense> monthExpenses, Optional<Budget> own, Optional<Budget> earlier) {
        Optional<Budget> b = own.isPresent() ? own : earlier;
        if (b.isEmpty()) return BudgetStatus.notConfigured(ym.toString());
        return BudgetCalculator.calculate(ym, today, b.get().getLimit(), b.get().getMode(), b.get().getExcludedCategories(), monthExpenses,
                own.isPresent() ? null : b.get().getMonthKey());
    }

    private PortfolioPart portfolio(List<Holding> list, LocalDate today) {
        if (list.isEmpty()) return null;
        List<String> keys = list.stream().map(Holding::marketKey).filter(Objects::nonNull).distinct().toList();
        // quotes and histories come from the shared price cache, kept warm by the refresh job
        PortfolioView v = PortfolioCalculator.calculate(list, market.quotes(keys), market.histories(keys), today, "1M");
        PortfolioView.Totals t = v.totals();
        if (t.holdingsCount() == 0) return null;
        return new PortfolioPart(t.value(), t.invested(), t.gain(), t.gainPct(), t.dayChange(), t.dayChangePct(), t.holdingsCount());
    }
}
