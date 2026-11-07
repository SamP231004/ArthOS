package com.arthos.demo;

import com.arthos.expense.Expense;
import com.arthos.income.Income;
import com.arthos.summary.MonthSummary;
import com.arthos.summary.MonthSummaryCalculator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

class DemoDataTest {

    @Test
    void generatesSixMonthsOfPastOnlyDataThatAllExpires() {
        LocalDate today = LocalDate.of(2026, 11, 5);
        Instant expiry = Instant.parse("2026-11-06T00:00:00Z");
        DemoData.Seed seed = DemoData.generate("u1", today, expiry, new Random(42));

        Set<String> months = Stream.concat(seed.incomes().stream().map(Income::getMonthKey), seed.expenses().stream().map(Expense::getMonthKey))
                .collect(Collectors.toSet());
        assertEquals(Set.of("2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"), months);

        assertTrue(seed.incomes().stream().allMatch(i -> !i.getDate().isAfter(today) && expiry.equals(i.getExpiresAt()) && "u1".equals(i.getUserId())));
        assertTrue(seed.expenses().stream().allMatch(e -> !e.getDate().isAfter(today) && expiry.equals(e.getExpiresAt()) && e.getAmount().signum() > 0));
        assertTrue(seed.expenses().size() > 150, "should look lived-in (older months are coarser), was " + seed.expenses().size());
    }

    @Test
    void pastMonthsSaveMoneyLikeARealPerson() {
        LocalDate today = LocalDate.of(2026, 11, 5);
        DemoData.Seed seed = DemoData.generate("u1", today, Instant.now(), new Random(7));
        YearMonth oct = YearMonth.of(2026, 10);

        MonthSummary s = MonthSummaryCalculator.calculate(oct, today, "INR", BigDecimal.valueOf(100_000),
                seed.incomes().stream().filter(i -> i.getMonthKey().equals("2026-10")).toList(),
                seed.expenses().stream().filter(e -> e.getMonthKey().equals("2026-10")).toList());

        assertTrue(s.net().signum() > 0, "demo persona should end the month positive");
        assertTrue(s.savingsRate().compareTo(BigDecimal.valueOf(10)) > 0 && s.savingsRate().compareTo(BigDecimal.valueOf(60)) < 0,
                "savings rate should be realistic, was " + s.savingsRate());
        assertEquals("RENT", s.expenseByCategory().getFirst().category());
    }

    @Test
    void rateLimiterBlocksAfterLimitAndRecoversAfterWindow() {
        var clock = new java.util.concurrent.atomic.AtomicLong(0);
        DemoRateLimiter limiter = new DemoRateLimiter(new java.time.Clock() {
            public java.time.ZoneId getZone() { return java.time.ZoneOffset.UTC; }
            public java.time.Clock withZone(java.time.ZoneId z) { return this; }
            public Instant instant() { return Instant.ofEpochMilli(clock.get()); }
        });
        for (int i = 0; i < DemoRateLimiter.MAX_PER_WINDOW; i++) assertTrue(limiter.tryAcquire("ip"));
        assertFalse(limiter.tryAcquire("ip"));
        assertTrue(limiter.tryAcquire("other-ip"));
        clock.addAndGet(DemoRateLimiter.WINDOW.toMillis() + 1);
        assertTrue(limiter.tryAcquire("ip"));
    }
}
