package com.arthos.summary;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Dashboard payload: everything the home screen needs for one month in a single request. */
public record MonthSummary(
        String month,
        String currency,
        int daysInMonth,
        int daysElapsed,
        BigDecimal incomeTarget,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal net,
        /** Percentage of income saved this month; null when there is no income yet. */
        BigDecimal savingsRate,
        /** Percentage of the monthly income target achieved; null when no target is set. */
        BigDecimal incomeTargetProgress,
        BigDecimal todayExpense,
        BigDecimal averageDailyExpense,
        List<CategoryTotal> expenseByCategory,
        List<TypeTotal> incomeByType,
        List<DailyTotal> dailyExpense,
        List<RecentTransaction> recent,
        int incomeCount,
        int expenseCount) {

    public record CategoryTotal(String category, BigDecimal amount, BigDecimal share) {}

    public record TypeTotal(String type, BigDecimal amount) {}

    public record DailyTotal(LocalDate date, BigDecimal amount) {}

    public record RecentTransaction(String id, String kind, BigDecimal amount, String label, String tag, LocalDate date) {}
}
