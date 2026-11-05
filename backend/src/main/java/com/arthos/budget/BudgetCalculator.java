package com.arthos.budget;

import com.arthos.budget.BudgetStatus.Day;
import com.arthos.budget.BudgetStatus.DayStatus;
import com.arthos.budget.BudgetStatus.Status;
import com.arthos.budget.BudgetStatus.Week;
import com.arthos.expense.Expense;
import com.arthos.expense.ExpenseCategory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * The budget engine (blueprint §8). Pure functions over a month's expenses, so the maths is testable and kept apart
 * from presentation (§13.1).
 *
 * <ul>
 *   <li><b>Fixed daily</b>: allowance = limit ÷ days in month, every day.</li>
 *   <li><b>Adaptive daily</b>: allowance(day d) = (limit − spent before d) ÷ days remaining from d. Under-spending
 *   lifts every later day; over-spending lowers them. Never negative.</li>
 *   <li><b>Weekly</b>: each week (days 1–7, 8–14, …) gets limit × weekDays ÷ monthDays. Inside a week, the daily guide
 *   adapts the same way as adaptive mode, but only within that week.</li>
 * </ul>
 * Expenses in excluded categories (fixed costs like rent) never count against the allowance.
 * Allowances round down to the paisa so the guidance is never generous by rounding.
 */
public final class BudgetCalculator {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal NEAR = new BigDecimal("0.8");

    private BudgetCalculator() {}

    public static BudgetStatus calculate(YearMonth month, LocalDate today, BigDecimal limit, BudgetMode mode,
                                         Collection<ExpenseCategory> excluded, List<Expense> expenses,
                                         String inheritedFrom) {
        int n = month.lengthOfMonth();
        YearMonth current = YearMonth.from(today);
        boolean isPast = month.isBefore(current);
        boolean isFuture = month.isAfter(current);
        int t = isPast ? n : isFuture ? 0 : today.getDayOfMonth(); // last elapsed day (0 = none)
        Set<ExpenseCategory> skip = excluded.isEmpty() ? EnumSet.noneOf(ExpenseCategory.class) : EnumSet.copyOf(excluded);

        // per-day counted spending (index 1..n)
        BigDecimal[] spent = new BigDecimal[n + 1];
        java.util.Arrays.fill(spent, BigDecimal.ZERO);
        BigDecimal excludedSpent = BigDecimal.ZERO;
        for (Expense e : expenses) {
            if (e.getDate() == null || !YearMonth.from(e.getDate()).equals(month) || e.getAmount() == null) continue;
            if (skip.contains(e.getCategory())) {
                excludedSpent = excludedSpent.add(e.getAmount());
            } else {
                int d = e.getDate().getDayOfMonth();
                spent[d] = spent[d].add(e.getAmount());
            }
        }

        BigDecimal[] allowance = allowances(mode, limit, spent, n);

        BigDecimal spentMonth = sum(spent, 1, n);
        int todayIdx = isPast || isFuture ? 0 : t;
        BigDecimal spentToday = todayIdx > 0 ? spent[todayIdx] : BigDecimal.ZERO;
        BigDecimal spentBefore = isFuture ? BigDecimal.ZERO : isPast ? spentMonth : sum(spent, 1, t - 1);
        int focusDay = isFuture ? 1 : isPast ? n : t; // the day the "today" figures describe
        BigDecimal todayAllowance = isPast ? BigDecimal.ZERO : allowance[focusDay];
        BigDecimal todayRemaining = isPast ? BigDecimal.ZERO : todayAllowance.subtract(spentToday).max(BigDecimal.ZERO);
        int daysRemaining = isPast ? 0 : isFuture ? n : n - t + 1;

        Week week = week(month, mode, limit, spent, allowance, n, focusDay, isPast);
        Status status = status(isPast, isFuture, mode, limit, spentMonth, spentToday, todayAllowance, week);

        List<Day> days = new ArrayList<>(n);
        for (int d = 1; d <= n; d++) {
            DayStatus ds;
            if (isFuture || d > t) ds = DayStatus.FUTURE;
            else if (!isPast && d == t) ds = DayStatus.TODAY;
            else ds = dayStatus(spent[d], allowance[d]);
            days.add(new Day(month.atDay(d), spent[d], allowance[d], ds));
        }

        BigDecimal projected = isFuture || t == 0 ? null
                : isPast ? spentMonth
                : spentMonth.multiply(BigDecimal.valueOf(n)).divide(BigDecimal.valueOf(t), 2, RoundingMode.HALF_UP);

        return new BudgetStatus(
                month.toString(), true, inheritedFrom != null, inheritedFrom, limit, mode, List.copyOf(skip),
                n, t, daysRemaining,
                spentMonth, spentToday, spentBefore, excludedSpent, limit.subtract(spentMonth),
                money(limit.divide(BigDecimal.valueOf(n), 10, RoundingMode.DOWN)), todayAllowance, todayRemaining,
                week, status,
                limit.signum() > 0 ? spentMonth.multiply(HUNDRED).divide(limit, 1, RoundingMode.HALF_UP) : null,
                BigDecimal.valueOf(t).multiply(HUNDRED).divide(BigDecimal.valueOf(n), 1, RoundingMode.HALF_UP),
                projected, days);
    }

    /** Allowance for each day 1..n under the given mode, as of the spending recorded so far. */
    static BigDecimal[] allowances(BudgetMode mode, BigDecimal limit, BigDecimal[] spent, int n) {
        BigDecimal[] a = new BigDecimal[n + 1];
        a[0] = BigDecimal.ZERO;
        switch (mode) {
            case FIXED_DAILY -> {
                BigDecimal base = money(limit.divide(BigDecimal.valueOf(n), 10, RoundingMode.DOWN));
                for (int d = 1; d <= n; d++) a[d] = base;
            }
            case ADAPTIVE_DAILY -> {
                BigDecimal before = BigDecimal.ZERO;
                for (int d = 1; d <= n; d++) {
                    a[d] = spread(limit.subtract(before), n - d + 1);
                    before = before.add(spent[d]);
                }
            }
            case WEEKLY -> {
                for (int start = 1; start <= n; start += 7) {
                    int end = Math.min(start + 6, n);
                    BigDecimal weekAllowance = weekAllowance(limit, end - start + 1, n);
                    BigDecimal before = BigDecimal.ZERO;
                    for (int d = start; d <= end; d++) {
                        a[d] = spread(weekAllowance.subtract(before), end - d + 1);
                        before = before.add(spent[d]);
                    }
                }
            }
        }
        return a;
    }

    private static Week week(YearMonth month, BudgetMode mode, BigDecimal limit, BigDecimal[] spent, BigDecimal[] allowance, int n,
                             int focusDay, boolean isPast) {
        int index = (focusDay - 1) / 7;
        int start = index * 7 + 1;
        int end = Math.min(start + 6, n);
        BigDecimal wa = weekAllowance(limit, end - start + 1, n);
        BigDecimal ws = sum(spent, start, end);
        int daysLeft = isPast ? 0 : end - focusDay + 1;
        BigDecimal guide = isPast ? BigDecimal.ZERO
                : mode == BudgetMode.WEEKLY ? allowance[focusDay]
                : spread(wa.subtract(sum(spent, start, focusDay - 1)), daysLeft);
        return new Week(index + 1, month.atDay(start), month.atDay(end), end - start + 1, wa, ws, wa.subtract(ws), daysLeft, guide);
    }

    private static Status status(boolean isPast, boolean isFuture, BudgetMode mode, BigDecimal limit, BigDecimal spentMonth,
                                 BigDecimal spentToday, BigDecimal todayAllowance, Week week) {
        if (isFuture) return Status.UPCOMING;
        if (spentMonth.compareTo(limit) > 0) return Status.OVER_MONTH;
        if (isPast) return Status.COMPLETED;
        BigDecimal used = mode == BudgetMode.WEEKLY ? week.spent() : spentToday;
        BigDecimal cap = mode == BudgetMode.WEEKLY ? week.allowance() : todayAllowance;
        if (cap.signum() <= 0) return used.signum() > 0 ? Status.OVER : Status.CAUTION;
        if (used.compareTo(cap) > 0) return Status.OVER;
        if (used.compareTo(cap.multiply(NEAR)) >= 0) return Status.CAUTION;
        return Status.ON_TRACK;
    }

    private static DayStatus dayStatus(BigDecimal spent, BigDecimal allowance) {
        if (allowance.signum() <= 0) return spent.signum() > 0 ? DayStatus.OVER : DayStatus.UNDER;
        if (spent.compareTo(allowance) > 0) return DayStatus.OVER;
        if (spent.compareTo(allowance.multiply(NEAR)) >= 0) return DayStatus.NEAR;
        return DayStatus.UNDER;
    }

    static BigDecimal weekAllowance(BigDecimal limit, int weekDays, int monthDays) {
        return money(limit.multiply(BigDecimal.valueOf(weekDays)).divide(BigDecimal.valueOf(monthDays), 10, RoundingMode.DOWN));
    }

    private static BigDecimal spread(BigDecimal amount, int days) {
        if (days <= 0 || amount.signum() <= 0) return BigDecimal.ZERO.setScale(2);
        return money(amount.divide(BigDecimal.valueOf(days), 10, RoundingMode.DOWN));
    }

    private static BigDecimal sum(BigDecimal[] a, int from, int to) {
        BigDecimal s = BigDecimal.ZERO;
        for (int i = Math.max(from, 1); i <= to && i < a.length; i++) s = s.add(a[i]);
        return s;
    }

    private static BigDecimal money(BigDecimal v) {
        return v.setScale(2, RoundingMode.DOWN);
    }
}
