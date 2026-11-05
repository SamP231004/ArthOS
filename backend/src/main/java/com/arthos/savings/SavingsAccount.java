package com.arthos.savings;

import com.arthos.user.SavingsRule;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * The savings account: money set aside first from every income, carried forward month to month.
 *
 * <pre>
 * closing(month) = opening(month) + savedFirst(month) − buys paid from savings + sale proceeds
 * opening(month) = closing(previous month); the very first month opens with the user's starting balance
 * </pre>
 * Buys paid from spending money never touch the account; they count as that month's spending instead.
 */
public record SavingsAccount(
        String month,
        /** Savings the user already had before tracking started. */
        BigDecimal startingBalance,
        /** Carried in from the previous month. */
        BigDecimal opening,
        BigDecimal savedFirst,
        /** Buys this month paid from the savings account. */
        BigDecimal investedFromSavings,
        /** Sales this month: proceeds go back into the savings account. */
        BigDecimal saleProceeds,
        /** Carried into next month; negative means more was invested than had been saved. */
        BigDecimal closing,
        /** Buys this month paid from spending money (counted as this month's spending). */
        BigDecimal investedFromSpending,
        /** The last few months up to and including {@link #month}, oldest first. */
        List<MonthRow> history) {

    public record MonthRow(String month, BigDecimal opening, BigDecimal saved, BigDecimal invested, BigDecimal proceeds, BigDecimal closing) {}

    public enum FlowKind { BUY_FROM_SAVINGS, BUY_FROM_SPENDING, SALE }

    public record Flow(LocalDate date, BigDecimal amount, FlowKind kind) {}

    private static final int HISTORY = 6;

    public static SavingsAccount calculate(YearMonth month, BigDecimal startingBalance, SavingsRule rule,
                                           Map<YearMonth, BigDecimal> incomeByMonth, List<Flow> flows) {
        BigDecimal start = money(startingBalance == null ? BigDecimal.ZERO : startingBalance);
        TreeMap<YearMonth, Totals> byMonth = totals(rule, incomeByMonth, flows);
        YearMonth first = byMonth.isEmpty() ? month : byMonth.firstKey().isBefore(month) ? byMonth.firstKey() : month;

        BigDecimal balance = start;
        List<MonthRow> rows = new ArrayList<>();
        Totals target = Totals.EMPTY;
        BigDecimal opening = start;
        for (YearMonth m = first; !m.isAfter(month); m = m.plusMonths(1)) {
            Totals t = byMonth.getOrDefault(m, Totals.EMPTY);
            BigDecimal open = balance;
            balance = balance.add(t.saved).subtract(t.fromSavings).add(t.proceeds);
            rows.add(new MonthRow(m.toString(), open, t.saved, t.fromSavings, t.proceeds, balance));
            if (m.equals(month)) {
                target = t;
                opening = open;
            }
        }
        List<MonthRow> history = rows.subList(Math.max(0, rows.size() - HISTORY), rows.size());
        return new SavingsAccount(month.toString(), start, opening, target.saved, target.fromSavings, target.proceeds, balance,
                target.fromSpending, List.copyOf(history));
    }

    /** The lowest closing balance across all months up to {@code through}, starting from zero. */
    public static BigDecimal lowestBalance(YearMonth through, SavingsRule rule, Map<YearMonth, BigDecimal> incomeByMonth, List<Flow> flows) {
        TreeMap<YearMonth, Totals> byMonth = totals(rule, incomeByMonth, flows);
        if (byMonth.isEmpty()) return BigDecimal.ZERO;
        BigDecimal balance = BigDecimal.ZERO, low = BigDecimal.ZERO;
        for (YearMonth m = byMonth.firstKey(); !m.isAfter(through); m = m.plusMonths(1)) {
            Totals t = byMonth.getOrDefault(m, Totals.EMPTY);
            balance = balance.add(t.saved).subtract(t.fromSavings);
            low = low.min(balance); // proceeds land after the month's buys, so the dip is measured before them
            balance = balance.add(t.proceeds);
        }
        return low;
    }

    private record Totals(BigDecimal saved, BigDecimal fromSavings, BigDecimal fromSpending, BigDecimal proceeds) {
        static final Totals EMPTY = new Totals(z(), z(), z(), z());

        Totals plus(FlowKind k, BigDecimal v) {
            return switch (k) {
                case BUY_FROM_SAVINGS -> new Totals(saved, fromSavings.add(v), fromSpending, proceeds);
                case BUY_FROM_SPENDING -> new Totals(saved, fromSavings, fromSpending.add(v), proceeds);
                case SALE -> new Totals(saved, fromSavings, fromSpending, proceeds.add(v));
            };
        }
    }

    private static TreeMap<YearMonth, Totals> totals(SavingsRule rule, Map<YearMonth, BigDecimal> incomeByMonth, List<Flow> flows) {
        TreeMap<YearMonth, Totals> out = new TreeMap<>();
        incomeByMonth.forEach((m, income) -> out.put(m, new Totals(rule.setAside(income), z(), z(), z())));
        for (Flow f : flows) {
            if (f.date() == null || f.amount() == null) continue;
            YearMonth m = YearMonth.from(f.date());
            out.put(m, out.getOrDefault(m, Totals.EMPTY).plus(f.kind(), money(f.amount())));
        }
        return out;
    }

    private static BigDecimal z() {
        return BigDecimal.ZERO.setScale(2);
    }

    private static BigDecimal money(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
