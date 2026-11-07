package com.arthos.insights;

import com.arthos.budget.BudgetCalculator;
import com.arthos.budget.BudgetMode;
import com.arthos.budget.BudgetStatus;
import com.arthos.expense.Expense;
import com.arthos.expense.ExpenseCategory;
import com.arthos.income.Income;
import com.arthos.income.IncomeType;
import com.arthos.insights.InsightsCalculator.Report;
import com.arthos.savings.SavingsAccount;
import com.arthos.user.SavingsRule;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class InsightsCalculatorTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 15);
    private static final YearMonth NOV = YearMonth.of(2026, 11);

    private static Expense e(String id, long amount, ExpenseCategory c, String merchant, LocalDate d, boolean recurring) {
        Expense x = new Expense();
        x.setId(id);
        x.setAmount(BigDecimal.valueOf(amount));
        x.setCategory(c);
        x.setMerchant(merchant);
        x.setDate(d);
        x.setMonthKey(YearMonth.from(d).toString());
        x.setRecurring(recurring);
        return x;
    }

    private static Income salary(LocalDate d) {
        Income i = new Income();
        i.setAmount(BigDecimal.valueOf(100_000));
        i.setType(IncomeType.SALARY);
        i.setSource("Employer");
        i.setDate(d);
        return i;
    }

    private Report report(List<Expense> ex, BigDecimal savingsBalance, List<LocalDate> buys) {
        List<Income> in = new ArrayList<>();
        for (int i = 0; i <= 3; i++) in.add(salary(NOV.minusMonths(i).atDay(1)));
        List<Expense> nov = ex.stream().filter(x -> YearMonth.from(x.getDate()).equals(NOV)).toList();
        BudgetStatus budget = BudgetCalculator.calculate(NOV, TODAY, BigDecimal.valueOf(30_000), BudgetMode.ADAPTIVE_DAILY, List.of(ExpenseCategory.RENT), nov, null);
        SavingsAccount acct = new SavingsAccount("2026-11", BigDecimal.ZERO, savingsBalance, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                savingsBalance, BigDecimal.ZERO, List.of());
        return InsightsCalculator.calculate(new InsightsCalculator.Input(NOV, TODAY, "INR", SavingsRule.DEFAULT, ex, in, budget, acct, buys));
    }

    @Test
    void comparesMidMonthFairlyAndFlagsTheUnusual() {
        List<Expense> ex = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            YearMonth p = NOV.minusMonths(i);
            ex.add(e("r" + i, 20_000, ExpenseCategory.RENT, "Landlord", p.atDay(2), true));
            ex.add(e("n" + i, 649, ExpenseCategory.SUBSCRIPTIONS, "Netflix", p.atDay(7), true));
            for (int d = 1; d <= 28; d += 3) ex.add(e("f" + i + d, 300, ExpenseCategory.FOOD, "Swiggy", p.atDay(d), false));
            ex.add(e("s" + i, 1_200, ExpenseCategory.SHOPPING, "Amazon", p.atDay(10), false));
        }
        // November so far (to the 15th): food doubled, one huge shopping order, Netflix price rise
        ex.add(e("r0", 20_000, ExpenseCategory.RENT, "Landlord", NOV.atDay(2), true));
        ex.add(e("n0", 799, ExpenseCategory.SUBSCRIPTIONS, "Netflix", NOV.atDay(7), true));
        for (int d = 1; d <= 15; d += 1) ex.add(e("f0" + d, 300, ExpenseCategory.FOOD, "Swiggy", NOV.atDay(d), false));
        ex.add(e("big", 9_000, ExpenseCategory.SHOPPING, "Croma", NOV.atDay(12), false));

        Report r = report(ex, BigDecimal.valueOf(150_000), List.of(NOV.atDay(3), NOV.minusMonths(1).atDay(3), NOV.minusMonths(2).atDay(3)));

        assertTrue(r.current());
        // food: 15 orders so far vs 5 by the 15th in earlier months → flagged as up
        var food = r.trends().stream().filter(t -> t.category() == ExpenseCategory.FOOD).findFirst().orElseThrow();
        assertEquals(0, BigDecimal.valueOf(4_500).compareTo(food.thisMonth()));
        assertEquals(0, BigDecimal.valueOf(1_500).compareTo(food.typical()));
        assertTrue(r.summary().stream().anyMatch(s -> s.startsWith("Food is up")), () -> String.join(" | ", r.summary()));

        assertEquals(1, r.anomalies().size());
        assertEquals("big", r.anomalies().getFirst().id());

        assertEquals(1, r.leakage().priceRises().size());
        assertEquals("Netflix", r.leakage().priceRises().getFirst().name());
        assertEquals(0, BigDecimal.valueOf(799).compareTo(r.leakage().monthly())); // rent is fixed, not leakage

        assertTrue(r.health().score() > 0 && r.health().score() <= 100);
        assertEquals(5, r.health().components().size());
        assertEquals(30, r.health().components().stream().filter(c -> c.key().equals("savings")).findFirst().orElseThrow().points()); // kept ~73%
        assertTrue(r.alerts().stream().anyMatch(a -> a.title().contains("Netflix costs more")));
        assertTrue(r.suggestions().stream().anyMatch(s -> s.title().contains("food")));
    }

    @Test
    void upcomingRecurringBillAlertAndEmptyMonth() {
        List<Expense> ex = List.of(e("b", 999, ExpenseCategory.UTILITIES, "Broadband", NOV.minusMonths(1).atDay(17), true));
        Report r = report(ex, BigDecimal.ZERO, List.of());
        assertTrue(r.alerts().stream().anyMatch(a -> a.title().equals("Broadband due in 2 days") && LocalDate.of(2026, 11, 17).equals(a.dueDate())),
                () -> r.alerts().toString());
        assertEquals("No spending logged yet this month.", r.summary().getFirst());
        assertTrue(r.anomalies().isEmpty());
    }
}
