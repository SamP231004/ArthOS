package com.arthos.summary;

import com.arthos.expense.Expense;
import com.arthos.expense.ExpenseCategory;
import com.arthos.expense.PaymentSource;
import com.arthos.income.Income;
import com.arthos.income.IncomeType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MonthSummaryCalculatorTest {

    private static final YearMonth NOV = YearMonth.of(2026, 11);

    @Test
    void computesTotalsRatesAndBreakdownsForCurrentMonth() {
        LocalDate today = LocalDate.of(2026, 11, 5);
        List<Income> incomes = List.of(income("50000", IncomeType.SALARY, 1), income("10000", IncomeType.FREELANCE, 3));
        List<Expense> expenses = List.of(
                expense("15000", ExpenseCategory.RENT, 1),
                expense("300", ExpenseCategory.FOOD, 5),
                expense("700", ExpenseCategory.FOOD, 5));

        MonthSummary s = MonthSummaryCalculator.calculate(NOV, today, "INR", new BigDecimal("80000"), incomes, expenses);

        assertEquals(30, s.daysInMonth());
        assertEquals(5, s.daysElapsed());
        assertEquals(0, new BigDecimal("60000").compareTo(s.totalIncome()));
        assertEquals(0, new BigDecimal("16000").compareTo(s.totalExpense()));
        assertEquals(0, new BigDecimal("44000").compareTo(s.net()));
        assertEquals(new BigDecimal("73.3"), s.savingsRate());
        assertEquals(new BigDecimal("75.0"), s.incomeTargetProgress());
        assertEquals(0, new BigDecimal("1000").compareTo(s.todayExpense()));
        assertEquals(new BigDecimal("3200.00"), s.averageDailyExpense());

        assertEquals("RENT", s.expenseByCategory().getFirst().category());
        assertEquals("SALARY", s.incomeByType().getFirst().type());
        assertEquals(5, s.dailyExpense().size());
        assertEquals(0, new BigDecimal("1000").compareTo(s.dailyExpense().get(4).amount()));
        assertEquals(5, s.recent().size());
        assertEquals(LocalDate.of(2026, 11, 5), s.recent().getFirst().date());
    }

    @Test
    void handlesEmptyAndPastMonths() {
        MonthSummary empty = MonthSummaryCalculator.calculate(NOV, LocalDate.of(2026, 11, 5), "INR", null, List.of(), List.of());
        assertNull(empty.savingsRate());
        assertNull(empty.incomeTargetProgress());
        assertEquals(0, BigDecimal.ZERO.compareTo(empty.net()));

        MonthSummary past = MonthSummaryCalculator.calculate(YearMonth.of(2026, 10), LocalDate.of(2026, 11, 5), "INR", null,
                List.of(), List.of(expense("100", ExpenseCategory.FOOD, LocalDate.of(2026, 10, 2))));
        assertEquals(31, past.daysElapsed());
        assertEquals(0, BigDecimal.ZERO.compareTo(past.todayExpense()));

        MonthSummary future = MonthSummaryCalculator.calculate(YearMonth.of(2026, 12), LocalDate.of(2026, 11, 5), "INR", null, List.of(), List.of());
        assertEquals(0, future.daysElapsed());
        assertTrue(future.dailyExpense().isEmpty());
    }

    private static Income income(String amount, IncomeType type, int day) {
        Income i = new Income();
        i.setAmount(new BigDecimal(amount));
        i.setType(type);
        i.setSource(type.name());
        i.setDate(NOV.atDay(day));
        return i;
    }

    private static Expense expense(String amount, ExpenseCategory cat, int day) {
        return expense(amount, cat, NOV.atDay(day));
    }

    private static Expense expense(String amount, ExpenseCategory cat, LocalDate date) {
        Expense e = new Expense();
        e.setAmount(new BigDecimal(amount));
        e.setCategory(cat);
        e.setPaymentSource(PaymentSource.UPI);
        e.setDate(date);
        return e;
    }
}
