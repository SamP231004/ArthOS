package com.arthos.summary;

import com.arthos.expense.Expense;
import com.arthos.income.Income;
import com.arthos.summary.MonthSummary.*;
import com.arthos.user.SavingsRule;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Stream;

/** Pure month-summary maths, kept free of Spring/Mongo so it is easy to test (architecture principle 13.1). */
public final class MonthSummaryCalculator {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final int RECENT_LIMIT = 6;

    private MonthSummaryCalculator() {}

    public static MonthSummary calculate(YearMonth month, LocalDate today, String currency, BigDecimal incomeTarget,
                                         List<Income> incomes, List<Expense> expenses) {
        return calculate(month, today, currency, incomeTarget, SavingsRule.DEFAULT, BigDecimal.ZERO, incomes, expenses);
    }

    public static MonthSummary calculate(YearMonth month, LocalDate today, String currency, BigDecimal incomeTarget,
                                         SavingsRule rule, BigDecimal invested, List<Income> incomes, List<Expense> expenses) {
        int daysInMonth = month.lengthOfMonth();
        YearMonth current = YearMonth.from(today);
        int daysElapsed = month.isBefore(current) ? daysInMonth : month.isAfter(current) ? 0 : today.getDayOfMonth();

        BigDecimal totalIncome = sum(incomes.stream().map(Income::getAmount));
        BigDecimal totalExpense = sum(expenses.stream().map(Expense::getAmount));
        BigDecimal net = totalIncome.subtract(totalExpense);

        BigDecimal savingsRate = totalIncome.signum() > 0 ? pct(net, totalIncome) : null;
        BigDecimal targetProgress = incomeTarget != null && incomeTarget.signum() > 0 ? pct(totalIncome, incomeTarget) : null;

        BigDecimal savedFirst = rule.setAside(totalIncome);
        BigDecimal spendable = totalIncome.subtract(savedFirst);
        BigDecimal leftToSpend = spendable.subtract(totalExpense);

        BigDecimal todayExpense = month.equals(current)
                ? sum(expenses.stream().filter(e -> today.equals(e.getDate())).map(Expense::getAmount))
                : BigDecimal.ZERO;
        BigDecimal avgDaily = daysElapsed > 0
                ? totalExpense.divide(BigDecimal.valueOf(daysElapsed), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new MonthSummary(
                month.toString(), currency, daysInMonth, daysElapsed, incomeTarget,
                totalIncome, totalExpense, net, savingsRate, targetProgress,
                rule, savedFirst, spendable, leftToSpend, invested == null ? BigDecimal.ZERO : invested,
                todayExpense, avgDaily,
                byCategory(expenses, totalExpense), byType(incomes), daily(month, daysElapsed, expenses),
                recent(incomes, expenses), incomes.size(), expenses.size());
    }

    private static List<CategoryTotal> byCategory(List<Expense> expenses, BigDecimal total) {
        Map<String, BigDecimal> map = new HashMap<>();
        for (Expense e : expenses) map.merge(e.getCategory().name(), e.getAmount(), BigDecimal::add);
        return map.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(en -> new CategoryTotal(en.getKey(), en.getValue(),
                        total.signum() > 0 ? pct(en.getValue(), total) : BigDecimal.ZERO))
                .toList();
    }

    private static List<TypeTotal> byType(List<Income> incomes) {
        Map<String, BigDecimal> map = new HashMap<>();
        for (Income i : incomes) map.merge(i.getType().name(), i.getAmount(), BigDecimal::add);
        return map.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(en -> new TypeTotal(en.getKey(), en.getValue()))
                .toList();
    }

    /** One entry per elapsed day (zero-filled), so charts render a continuous series. */
    private static List<DailyTotal> daily(YearMonth month, int daysElapsed, List<Expense> expenses) {
        Map<LocalDate, BigDecimal> map = new HashMap<>();
        for (Expense e : expenses) map.merge(e.getDate(), e.getAmount(), BigDecimal::add);
        List<DailyTotal> out = new ArrayList<>(daysElapsed);
        for (int d = 1; d <= daysElapsed; d++) {
            LocalDate date = month.atDay(d);
            out.add(new DailyTotal(date, map.getOrDefault(date, BigDecimal.ZERO)));
        }
        return out;
    }

    private static List<RecentTransaction> recent(List<Income> incomes, List<Expense> expenses) {
        record Row(RecentTransaction tx, Instant created) {}
        Stream<Row> in = incomes.stream().map(i -> new Row(
                new RecentTransaction(i.getId(), "INCOME", i.getAmount(), i.getSource(), i.getType().name(), i.getDate()),
                i.getCreatedAt()));
        Stream<Row> out = expenses.stream().map(e -> new Row(
                new RecentTransaction(e.getId(), "EXPENSE", e.getAmount(),
                        e.getMerchant() != null ? e.getMerchant() : prettify(e.getCategory().name()),
                        e.getCategory().name(), e.getDate()),
                e.getCreatedAt()));
        Comparator<Row> order = Comparator.comparing((Row r) -> r.tx().date())
                .thenComparing(Row::created, Comparator.nullsFirst(Comparator.naturalOrder()))
                .reversed();
        return Stream.concat(in, out).sorted(order).limit(RECENT_LIMIT).map(Row::tx).toList();
    }

    private static BigDecimal sum(Stream<BigDecimal> values) {
        return values.filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal pct(BigDecimal part, BigDecimal whole) {
        return part.multiply(HUNDRED).divide(whole, 1, RoundingMode.HALF_UP);
    }

    private static String prettify(String enumName) {
        String s = enumName.replace('_', ' ').toLowerCase(Locale.ROOT);
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
