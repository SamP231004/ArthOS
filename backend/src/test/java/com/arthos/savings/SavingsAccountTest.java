package com.arthos.savings;

import com.arthos.savings.SavingsAccount.Flow;
import com.arthos.savings.SavingsAccount.FlowKind;
import com.arthos.user.SavingsRule;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SavingsAccountTest {

    private static final SavingsRule TWENTY = new SavingsRule(SavingsRule.Mode.PERCENT, BigDecimal.valueOf(20));
    private static final YearMonth SEP = YearMonth.of(2026, 9), OCT = YearMonth.of(2026, 10), NOV = YearMonth.of(2026, 11);

    @Test
    void carriesTheBalanceForwardMonthToMonth() {
        Map<YearMonth, BigDecimal> income = Map.of(SEP, bd("100000"), OCT, bd("100000"), NOV, bd("50000"));
        List<Flow> flows = List.of(
                new Flow(LocalDate.of(2026, 9, 10), bd("15000"), FlowKind.BUY_FROM_SAVINGS),
                new Flow(LocalDate.of(2026, 10, 5), bd("3000"), FlowKind.BUY_FROM_SPENDING), // never touches savings
                new Flow(LocalDate.of(2026, 10, 20), bd("8000"), FlowKind.SALE),
                new Flow(LocalDate.of(2026, 11, 2), bd("12000"), FlowKind.BUY_FROM_SAVINGS));

        SavingsAccount sep = SavingsAccount.calculate(SEP, bd("10000"), TWENTY, income, flows);
        eq("10000", sep.opening());
        eq("15000", sep.closing()); // 10k + 20k saved − 15k invested

        SavingsAccount oct = SavingsAccount.calculate(OCT, bd("10000"), TWENTY, income, flows);
        eq("15000", oct.opening());
        eq("3000", oct.investedFromSpending());
        eq("43000", oct.closing()); // 15k + 20k + 8k sale

        SavingsAccount nov = SavingsAccount.calculate(NOV, bd("10000"), TWENTY, income, flows);
        eq("43000", nov.opening());
        eq("10000", nov.savedFirst());
        eq("41000", nov.closing()); // 43k + 10k − 12k
        assertEquals(3, nov.history().size());

        // a month with no activity still carries the balance
        SavingsAccount dec = SavingsAccount.calculate(YearMonth.of(2026, 12), bd("10000"), TWENTY, income, flows);
        eq("41000", dec.opening());
        eq("41000", dec.closing());
    }

    @Test
    void lowestBalanceFindsTheDeepestDipFromZero() {
        Map<YearMonth, BigDecimal> income = Map.of(OCT, bd("50000"), NOV, bd("50000"));
        List<Flow> flows = List.of(new Flow(LocalDate.of(2026, 9, 1), bd("40000"), FlowKind.BUY_FROM_SAVINGS));
        eq("-40000", SavingsAccount.lowestBalance(NOV, TWENTY, income, flows));
    }

    private static BigDecimal bd(String s) {
        return new BigDecimal(s);
    }

    private static void eq(String expected, BigDecimal actual) {
        assertEquals(0, bd(expected).compareTo(actual), () -> "expected " + expected + " but was " + actual);
    }
}
