package com.arthos.automation;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Automatic recurring detection (blueprint §11, §17): finds bills and income that come back every month but
 * aren't marked recurring yet. A group qualifies when it appears in at least {@value #MIN_MONTHS} of the recent
 * months, about once per month (so daily food delivery doesn't count), at a steady amount (every entry within
 * {@value #TOLERANCE_PCT}% of the typical amount).
 */
public final class RecurringDetector {

    public enum Kind { EXPENSE, INCOME }

    /** One transaction, reduced to what detection needs. */
    public record Entry(String id, Kind kind, String name, String tag, BigDecimal amount, LocalDate date, boolean recurring) {}

    public record Candidate(Kind kind, String key, String name, String tag, BigDecimal typicalAmount, int months, LocalDate lastDate, int dayOfMonth) {}

    static final int MIN_MONTHS = 2;
    static final int TOLERANCE_PCT = 25;
    private static final double MAX_PER_MONTH = 1.5;

    private RecurringDetector() {}

    public static List<Candidate> detect(List<Entry> entries) {
        Map<String, List<Entry>> groups = new HashMap<>();
        Set<String> alreadyRecurring = new java.util.HashSet<>();
        for (Entry e : entries) {
            String key = MerchantKey.of(e.name());
            if (key.isBlank() || e.amount() == null || e.date() == null) continue;
            String gk = e.kind() + ":" + key;
            if (e.recurring()) alreadyRecurring.add(gk);
            groups.computeIfAbsent(gk, k -> new ArrayList<>()).add(e);
        }

        List<Candidate> out = new ArrayList<>();
        for (Map.Entry<String, List<Entry>> g : groups.entrySet()) {
            if (alreadyRecurring.contains(g.getKey())) continue; // the user already told us
            List<Entry> list = g.getValue();
            TreeSet<YearMonth> months = new TreeSet<>();
            for (Entry e : list) months.add(YearMonth.from(e.date()));
            if (months.size() < MIN_MONTHS) continue;
            if ((double) list.size() / months.size() > MAX_PER_MONTH) continue;

            List<BigDecimal> amounts = list.stream().map(Entry::amount).sorted().toList();
            BigDecimal median = amounts.get(amounts.size() / 2);
            BigDecimal tol = median.multiply(BigDecimal.valueOf(TOLERANCE_PCT)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            boolean steady = amounts.stream().allMatch(a -> a.subtract(median).abs().compareTo(tol) <= 0);
            if (!steady) continue;

            Entry last = list.stream().max(Comparator.comparing(Entry::date)).orElseThrow();
            int typicalDay = (int) Math.round(list.stream().mapToInt(e -> e.date().getDayOfMonth()).average().orElse(last.date().getDayOfMonth()));
            out.add(new Candidate(last.kind(), g.getKey().substring(g.getKey().indexOf(':') + 1), last.name(), last.tag(), median, months.size(), last.date(), typicalDay));
        }
        out.sort(Comparator.comparing(Candidate::typicalAmount).reversed());
        return out;
    }
}
