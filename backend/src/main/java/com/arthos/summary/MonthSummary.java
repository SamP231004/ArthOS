package com.arthos.summary;

import com.arthos.savings.SavingsAccount;
import com.arthos.user.SavingsRule;

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
        /** The pay-yourself-first rule in force. */
        SavingsRule savingsRule,
        /** Set aside the moment income arrived (rule applied to this month's income). */
        BigDecimal savedFirst,
        /** Income after saving first: what this month's spending is allowed to come out of. */
        BigDecimal spendable,
        /** spendable − totalExpense − investments paid from spending; negative means spending ate into savings. */
        BigDecimal leftToSpend,
        /** All buys recorded in investments this month, whichever pot paid for them. */
        BigDecimal investedThisMonth,
        /** The savings account for this month, carried forward from earlier months. */
        SavingsAccount savings,
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
