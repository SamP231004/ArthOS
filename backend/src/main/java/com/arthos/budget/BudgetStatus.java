package com.arthos.budget;

import com.arthos.expense.ExpenseCategory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Everything a client needs to show the budget and explain how each number was derived (blueprint §8.3, "make the
 * budget logic transparent"). All money is in major units.
 */
public record BudgetStatus(
        String month,
        /** False when the user has never set a budget; every other field except month is then empty. */
        boolean configured,
        /** True when this month uses a budget carried forward from {@link #inheritedFrom}. */
        boolean inherited,
        String inheritedFrom,
        BigDecimal limit,
        BudgetMode mode,
        List<ExpenseCategory> excludedCategories,

        int daysInMonth,
        /** Day of month treated as "today": 0 for a future month, daysInMonth for a past month. */
        int dayOfMonth,
        /** Days left including today. */
        int daysRemaining,

        /** Counted spending (excluded categories removed). */
        BigDecimal spentMonth,
        BigDecimal spentToday,
        BigDecimal spentBeforeToday,
        /** Spending in excluded categories, shown separately for transparency. */
        BigDecimal excludedSpent,
        /** limit − spentMonth; negative when over. */
        BigDecimal remainingMonth,

        /** limit ÷ daysInMonth: the plain fixed number, shown for comparison in every mode. */
        BigDecimal baseDailyAllowance,
        /** How much may be spent today under the active mode ("safe to spend today" before today's spending). */
        BigDecimal todayAllowance,
        /** todayAllowance − spentToday, floored at zero. */
        BigDecimal todayRemaining,

        Week week,
        Status status,
        /** spentMonth ÷ limit × 100. */
        BigDecimal usedPct,
        /** dayOfMonth ÷ daysInMonth × 100. */
        BigDecimal elapsedPct,
        /** Straight-line projection of month-end spending at the current pace; null before any day elapsed. */
        BigDecimal projectedSpend,

        List<Day> days,

        /** Today's figures under every mode, for a one-tap mode switch (filled by the controller). */
        List<ModeOption> modes) {

    public record ModeOption(BudgetMode mode, BigDecimal todayAllowance, BigDecimal todayRemaining, BigDecimal weekRemaining, Status status) {}

    public BudgetStatus withModes(List<ModeOption> options) {
        return new BudgetStatus(month, configured, inherited, inheritedFrom, limit, mode, excludedCategories, daysInMonth, dayOfMonth,
                daysRemaining, spentMonth, spentToday, spentBeforeToday, excludedSpent, remainingMonth, baseDailyAllowance,
                todayAllowance, todayRemaining, week, status, usedPct, elapsedPct, projectedSpend, days, options);
    }

    public enum Status {
        /** Comfortably within today's (or this week's) allowance. */
        ON_TRACK,
        /** 80–100% of the current period's allowance used. */
        CAUTION,
        /** Over the current period's allowance. */
        OVER,
        /** Monthly limit already exceeded. */
        OVER_MONTH,
        /** Month not started yet. */
        UPCOMING,
        /** Month finished within its limit. */
        COMPLETED
    }

    public enum DayStatus { UNDER, NEAR, OVER, TODAY, FUTURE }

    public record Week(int index, LocalDate start, LocalDate end, int days, BigDecimal allowance, BigDecimal spent,
                       BigDecimal remaining, int daysLeft, BigDecimal dailyGuide) {}

    public record Day(LocalDate date, BigDecimal spent, BigDecimal allowance, DayStatus status) {}

    public static BudgetStatus notConfigured(String month) {
        return new BudgetStatus(month, false, false, null, null, null, List.of(), 0, 0, 0, null, null, null, null,
                null, null, null, null, null, null, null, null, null, List.of(), List.of());
    }
}
