package com.arthos.budget;

import com.arthos.budget.BudgetStatus.DayStatus;
import com.arthos.budget.BudgetStatus.Status;
import com.arthos.expense.Expense;
import com.arthos.expense.ExpenseCategory;
import com.arthos.expense.PaymentSource;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class BudgetCalculatorTest {

    private static final YearMonth NOV = YearMonth.of(2026, 11); // 30 days
    private static final BigDecimal L = new BigDecimal("30000");
    private static final List<ExpenseCategory> EXCL = List.of(ExpenseCategory.RENT, ExpenseCategory.EMI);

    private static BudgetStatus calc(BudgetMode mode, LocalDate today, Expense... es) {
        return BudgetCalculator.calculate(NOV, today, L, mode, EXCL, List.of(es), null);
    }

    @Test
    void fixedDailyIsLimitOverDaysEveryDay() {
        BudgetStatus s = calc(BudgetMode.FIXED_DAILY, NOV.atDay(11), exp(16_500, 5), exp(200, 11));
        assertEq("1000.00", s.baseDailyAllowance());
        assertEq("1000.00", s.todayAllowance());
        assertEq("800.00", s.todayRemaining());
        assertEq("13300", s.remainingMonth());
        assertEquals(20, s.daysRemaining());
        assertEquals(Status.ON_TRACK, s.status());
        assertEquals(DayStatus.OVER, s.days().get(4).status()); // day 5: 16,500 vs 1,000
    }

    @Test
    void adaptiveSpreadsOverspendAcrossRemainingDays() {
        // Blueprint example: ₹30,000 month, ₹16,500 spent by end of day 11 → 13,500 over 19 days on day 12.
        BudgetStatus s = calc(BudgetMode.ADAPTIVE_DAILY, NOV.atDay(12), exp(16_500, 3));
        assertEq("16500", s.spentBeforeToday());
        assertEq("710.52", s.todayAllowance()); // 13,500 / 19, rounded down
        assertEquals(19, s.daysRemaining());
        assertEq("1000.00", s.days().get(0).allowance()); // day 1 before any spending
        assertEq("1071.42", s.days().get(2).allowance()); // days 1–2 unspent roll forward: 30,000 / 28
        assertEq("500.00", s.days().get(3).allowance()); // (30,000 − 16,500) / 27
    }

    @Test
    void adaptiveRollsSavingsForward() {
        BudgetStatus s = calc(BudgetMode.ADAPTIVE_DAILY, NOV.atDay(11), exp(4_000, 2)); // well under 10 × 1,000
        assertEq("1300.00", s.todayAllowance()); // 26,000 / 20
        assertEquals(Status.ON_TRACK, s.status());
    }

    @Test
    void excludedCategoriesDoNotCountButAreReported() {
        BudgetStatus s = calc(BudgetMode.ADAPTIVE_DAILY, NOV.atDay(5), exp(24_000, 2, ExpenseCategory.RENT), exp(500, 5));
        assertEq("500", s.spentMonth());
        assertEq("24000", s.excludedSpent());
        assertEq("1153.84", s.todayAllowance()); // rent ignored: 30,000 / 26 days left
        assertEquals(List.of(ExpenseCategory.RENT, ExpenseCategory.EMI), s.excludedCategories());
    }

    @Test
    void statusMovesThroughCautionAndOver() {
        assertEquals(Status.CAUTION, calc(BudgetMode.FIXED_DAILY, NOV.atDay(9), exp(850, 9)).status());
        assertEquals(Status.OVER, calc(BudgetMode.FIXED_DAILY, NOV.atDay(9), exp(1_200, 9)).status());
        assertEquals(Status.OVER_MONTH, calc(BudgetMode.ADAPTIVE_DAILY, NOV.atDay(9), exp(31_000, 2)).status());
        BudgetStatus drained = calc(BudgetMode.ADAPTIVE_DAILY, NOV.atDay(9), exp(31_000, 2));
        assertEq("0.00", drained.todayAllowance()); // never negative
        assertEq("-1000", drained.remainingMonth());
    }

    @Test
    void weeklySplitsByWeekAndGuidesDailyWithinWeek() {
        // Week 2 = days 8–14: 30,000 × 7 / 30 = 7,000. Spent 3,000 on day 8 → day 10 guide = 4,000 / 5 = 800.
        BudgetStatus s = calc(BudgetMode.WEEKLY, NOV.atDay(10), exp(3_000, 8));
        assertEquals(2, s.week().index());
        assertEquals(NOV.atDay(8), s.week().start());
        assertEquals(NOV.atDay(14), s.week().end());
        assertEq("7000.00", s.week().allowance());
        assertEq("4000.00", s.week().remaining());
        assertEquals(5, s.week().daysLeft());
        assertEq("800.00", s.todayAllowance());
        assertEquals(Status.ON_TRACK, s.status());
        // last week is days 29–30: 2,000
        assertEq("2000.00", BudgetCalculator.weekAllowance(L, 2, 30));
    }

    @Test
    void pastAndFutureMonths() {
        BudgetStatus past = BudgetCalculator.calculate(YearMonth.of(2026, 10), NOV.atDay(5), L, BudgetMode.ADAPTIVE_DAILY, EXCL,
                List.of(expOn(29_000, LocalDate.of(2026, 10, 3))), null);
        assertEquals(Status.COMPLETED, past.status());
        assertEquals(31, past.dayOfMonth());
        assertEquals(0, past.daysRemaining());
        assertTrue(past.days().stream().noneMatch(d -> d.status() == DayStatus.TODAY || d.status() == DayStatus.FUTURE));

        BudgetStatus future = BudgetCalculator.calculate(YearMonth.of(2026, 12), NOV.atDay(5), L, BudgetMode.FIXED_DAILY, EXCL,
                List.of(), "2026-11");
        assertEquals(Status.UPCOMING, future.status());
        assertTrue(future.inherited());
        assertEquals("2026-11", future.inheritedFrom());
        assertNull(future.projectedSpend());
        assertTrue(future.days().stream().allMatch(d -> d.status() == DayStatus.FUTURE));
    }

    @Test
    void projectionUsesCurrentPace() {
        BudgetStatus s = calc(BudgetMode.FIXED_DAILY, NOV.atDay(10), exp(12_000, 4));
        assertEq("36000.00", s.projectedSpend());
        assertEq("40.0", s.usedPct());
        assertEq("33.3", s.elapsedPct());
    }

    private static Expense exp(long amount, int day) {
        return exp(amount, day, ExpenseCategory.FOOD);
    }

    private static Expense exp(long amount, int day, ExpenseCategory cat) {
        Expense e = expOn(amount, NOV.atDay(day));
        e.setCategory(cat);
        return e;
    }

    private static Expense expOn(long amount, LocalDate date) {
        Expense e = new Expense();
        e.setAmount(BigDecimal.valueOf(amount));
        e.setCategory(ExpenseCategory.FOOD);
        e.setPaymentSource(PaymentSource.UPI);
        e.setDate(date);
        return e;
    }

    private static void assertEq(String expected, BigDecimal actual) {
        assertNotNull(actual);
        assertEquals(0, new BigDecimal(expected).compareTo(actual), "expected " + expected + " but was " + actual);
    }
}
