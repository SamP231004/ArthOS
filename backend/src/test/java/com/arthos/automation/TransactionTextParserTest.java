package com.arthos.automation;

import com.arthos.automation.TransactionTextParser.Kind;
import com.arthos.automation.TransactionTextParser.Parsed;
import com.arthos.expense.ExpenseCategory;
import com.arthos.expense.PaymentSource;
import com.arthos.income.IncomeType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class TransactionTextParserTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 6);

    private static Parsed parse(String text) {
        return TransactionTextParser.parse(text, TODAY);
    }

    private static void amount(String expected, Parsed p) {
        assertNotNull(p.amount(), "amount");
        assertEquals(0, new BigDecimal(expected).compareTo(p.amount()), () -> "amount was " + p.amount());
    }

    @Test
    void googlePaySuccessScreen() {
        Parsed p = parse("""
                ₹450
                Paid to
                Swiggy
                swiggy.stores@axisbank
                Completed
                5 Nov 2026, 9:14 pm
                UPI transaction ID
                431298765432
                To: Swiggy
                From: Samarth Patel (HDFC Bank 4821)
                Google transaction ID
                CICAgKD7xYXkQQ
                """);
        assertEquals(Kind.EXPENSE, p.kind());
        amount("450", p);
        assertEquals("Swiggy", p.merchant());
        assertEquals(LocalDate.of(2026, 11, 5), p.date());
        assertEquals("431298765432", p.reference());
        assertEquals(PaymentSource.UPI, p.paymentSource());
        assertTrue(p.confidence() >= 0.9);
        assertEquals(ExpenseCategory.FOOD, CategoryRules.expense(p.merchant(), "").orElseThrow());
    }

    @Test
    void phonePeWithMisreadRupeeSign() {
        Parsed p = parse("""
                Transaction Successful
                04:12 pm on 03 Nov 2026
                Paid to
                BLINKIT
                %1,248.50
                Transaction ID
                T2611031612345678901234
                Debited from
                XXXXXXXX4821
                UTR: 530712345678
                """);
        assertEquals(Kind.EXPENSE, p.kind());
        amount("1248.50", p);
        assertEquals("Blinkit", p.merchant());
        assertEquals(LocalDate.of(2026, 11, 3), p.date());
        assertEquals(ExpenseCategory.GROCERIES, CategoryRules.expense(p.merchant(), "").orElseThrow());
    }

    @Test
    void bankDebitSmsIgnoresAvailableBalance() {
        Parsed p = parse("Rs.649.00 debited from A/c XX4821 on 07-11-26 to VPA netflix@hdfcbank (UPI Ref No 530912345678). Avl Bal Rs.48,212.10 -HDFC Bank");
        assertEquals(Kind.EXPENSE, p.kind());
        amount("649", p);
        assertNull(p.date()); // 7 Nov is after "today" (6 Nov), so it is not trusted
        assertEquals("Netflix", p.merchant());
        assertEquals("530912345678", p.reference());
        assertEquals(ExpenseCategory.SUBSCRIPTIONS, CategoryRules.expense(p.merchant(), "netflix").orElseThrow());
    }

    @Test
    void cardSpendSms() {
        Parsed p = parse("You have spent Rs 2,340.00 on your HDFC Bank Credit Card XX1234 at AMAZON on 2026-11-02. Not you? Call 18002586161");
        assertEquals(Kind.EXPENSE, p.kind());
        amount("2340", p);
        assertEquals("Amazon", p.merchant());
        assertEquals(LocalDate.of(2026, 11, 2), p.date());
        assertEquals(PaymentSource.CREDIT_CARD, p.paymentSource());
    }

    @Test
    void salaryCreditIsIncome() {
        Parsed p = parse("Your A/c XX4821 is credited with INR 92,000.00 on 01/11/2026 by NEFT from NORTHWIND LABS PVT LTD - Salary. Avl Bal INR 1,12,450.00");
        assertEquals(Kind.INCOME, p.kind());
        amount("92000", p);
        assertEquals(LocalDate.of(2026, 11, 1), p.date());
        assertEquals(PaymentSource.BANK_TRANSFER, p.paymentSource());
        assertEquals(IncomeType.SALARY, CategoryRules.income(p.merchant(), "salary").orElseThrow());
    }

    @Test
    void upiMoneyReceived() {
        Parsed p = parse("""
                ₹1,200
                Received from
                Rahul Sharma
                rahul.s@okicici
                2 Nov 2026, 6:40 pm
                """);
        assertEquals(Kind.INCOME, p.kind());
        amount("1200", p);
        assertEquals("Rahul Sharma", p.merchant());
    }

    @Test
    void shopReceiptUsesGrandTotal() {
        Parsed p = parse("""
                THIRD WAVE COFFEE
                Indiranagar, Bengaluru
                TAX INVOICE
                Bill No: 4417   Date: 04/11/2026
                Cappuccino        1   260.00
                Croissant         1   180.00
                Sub Total             440.00
                CGST 2.5%              11.00
                SGST 2.5%              11.00
                Grand Total           462.00
                Thank you! Visit again
                """);
        amount("462", p);
        assertEquals("Third Wave Coffee", p.merchant());
        assertEquals(LocalDate.of(2026, 11, 4), p.date());
        assertEquals(ExpenseCategory.FOOD, CategoryRules.expense(p.merchant(), "").orElseThrow());
    }

    @Test
    void futureAndAncientDatesAreIgnoredAndNothingFoundIsEmpty() {
        Parsed p = parse("Paid to Uber ₹312 on 12 Dec 2026");
        amount("312", p);
        assertNull(p.date()); // after today: not trusted
        assertEquals("Uber", p.merchant());

        Parsed nothing = parse("hello world");
        assertNull(nothing.amount());
        assertTrue(TransactionTextParser.usable(nothing).isEmpty());
    }

    @Test
    void categoryRulesUseWholeWords() {
        assertTrue(CategoryRules.expense("Coca Cola", "").isEmpty() || CategoryRules.expense("Coca Cola", "").get() != ExpenseCategory.TRANSPORT);
        assertEquals(ExpenseCategory.TRANSPORT, CategoryRules.expense("Ola", "").orElseThrow());
        assertEquals("swiggy", MerchantKey.of("SWIGGY Pvt. Ltd."));
        assertEquals("netflix", MerchantKey.of("netflix@hdfcbank"));
    }
}
