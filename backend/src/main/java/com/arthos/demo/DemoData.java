package com.arthos.demo;

import com.arthos.common.MonthKey;
import com.arthos.expense.Expense;
import com.arthos.expense.ExpenseCategory;
import com.arthos.expense.PaymentSource;
import com.arthos.income.Income;
import com.arthos.income.IncomeType;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import static com.arthos.expense.ExpenseCategory.*;
import static com.arthos.expense.PaymentSource.*;

/**
 * Generates a believable three-month financial history for a demo account: a salaried professional in
 * Bengaluru with rent, subscriptions, everyday UPI spending and the odd freelance payment. Pure and seedable.
 */
public final class DemoData {

    public static final int MONTHS = 3;

    public record Seed(List<Income> incomes, List<Expense> expenses) {}

    private final String userId;
    private final LocalDate today;
    private final Instant expiresAt;
    private final Random rnd;
    private final List<Income> incomes = new ArrayList<>();
    private final List<Expense> expenses = new ArrayList<>();

    private DemoData(String userId, LocalDate today, Instant expiresAt, Random rnd) {
        this.userId = userId;
        this.today = today;
        this.expiresAt = expiresAt;
        this.rnd = rnd;
    }

    public static Seed generate(String userId, LocalDate today, Instant expiresAt, Random rnd) {
        DemoData d = new DemoData(userId, today, expiresAt, rnd);
        YearMonth current = YearMonth.from(today);
        for (int back = MONTHS - 1; back >= 0; back--) d.month(current.minusMonths(back), back);
        return new Seed(d.incomes, d.expenses);
    }

    private void month(YearMonth ym, int monthsAgo) {
        // ---- income ----
        income(ym, 1, 92_000, "Northwind Labs", IncomeType.SALARY, "Monthly salary", true);
        if (monthsAgo == 2) income(ym, 18, 18_000, "Pixel & Co.", IncomeType.FREELANCE, "Brand design retainer", false);
        if (monthsAgo == 1) income(ym, 15, 1_240, "Nifty 50 index fund", IncomeType.DIVIDEND, null, false);
        if (monthsAgo == 1) income(ym, 22, 12_500, "Pixel & Co.", IncomeType.FREELANCE, "Landing page project", false);
        income(ym, ym.lengthOfMonth(), 412, "Savings account", IncomeType.INTEREST, null, false);

        // ---- fixed / recurring ----
        expense(ym, 2, 24_000, RENT, "Landlord", BANK_TRANSFER, "Indiranagar 1BHK", true);
        expense(ym, 5, 2_499, EMI, "Phone EMI", CREDIT_CARD, "6 of 12", true);
        expense(ym, 7, 649, SUBSCRIPTIONS, "Netflix", CREDIT_CARD, null, true);
        expense(ym, 12, 119, SUBSCRIPTIONS, "Spotify", UPI, null, true);
        expense(ym, 9, 999, UTILITIES, "Broadband", UPI, "300 Mbps plan", true);
        expense(ym, 11, between(1_450, 2_300), UTILITIES, "Electricity bill", UPI, null, false);
        expense(ym, 14, 1_500, HEALTH, "Cult gym", UPI, "Membership", true);

        // ---- everyday spending ----
        for (int day = 1; day <= ym.lengthOfMonth(); day++) {
            if (chance(0.62)) expense(ym, day, between(140, 780), FOOD, pick("Swiggy", "Zomato", "Third Wave Coffee", "Office canteen", "Truffles"), UPI, null, false);
            if (chance(0.48)) expense(ym, day, between(60, 420), TRANSPORT, pick("Uber", "Namma Metro", "Rapido", "Ola"), UPI, null, false);
            if (day % 4 == 2) expense(ym, day, between(550, 2_400), GROCERIES, pick("BigBasket", "Blinkit", "Zepto", "DMart"), UPI, null, false);
        }
        for (int i = 0; i < 2 + rnd.nextInt(2); i++)
            expense(ym, 1 + rnd.nextInt(ym.lengthOfMonth()), between(899, 4_800), SHOPPING, pick("Amazon", "Myntra", "Decathlon", "IKEA"), CREDIT_CARD, null, false);
        expense(ym, 6 + rnd.nextInt(18), between(450, 1_300), ENTERTAINMENT, pick("PVR Cinemas", "BookMyShow", "Steam"), UPI, null, false);
        expense(ym, 3 + rnd.nextInt(24), between(280, 1_200), HEALTH, "Apollo Pharmacy", UPI, null, false);
        expense(ym, 8 + rnd.nextInt(18), between(350, 900), PERSONAL_CARE, pick("Salon", "Nykaa"), UPI, null, false);
        if (monthsAgo == 1) {
            expense(ym, 19, 7_840, TRAVEL, "IndiGo", CREDIT_CARD, "Weekend in Goa", false);
            expense(ym, 20, 5_600, TRAVEL, "Airbnb", CREDIT_CARD, "Weekend in Goa", false);
            expense(ym, 26, 2_500, GIFTS, "Gift — Riya's birthday", UPI, null, false);
        }
        if (monthsAgo == 0) expense(ym, 4, 3_200, EDUCATION, "Online course", CREDIT_CARD, "Personal finance basics", false);
    }

    private void income(YearMonth ym, int day, long amount, String source, IncomeType type, String note, boolean recurring) {
        LocalDate date = dateIn(ym, day);
        if (date == null) return;
        Income i = new Income();
        i.setUserId(userId);
        i.setAmount(BigDecimal.valueOf(amount));
        i.setSource(source);
        i.setType(type);
        i.setDate(date);
        i.setMonthKey(MonthKey.of(date));
        i.setNote(note);
        i.setRecurring(recurring);
        i.setExpiresAt(expiresAt);
        incomes.add(i);
    }

    private void expense(YearMonth ym, int day, long amount, ExpenseCategory cat, String merchant, PaymentSource via, String note, boolean recurring) {
        expense(ym, day, BigDecimal.valueOf(amount), cat, merchant, via, note, recurring);
    }

    private void expense(YearMonth ym, int day, BigDecimal amount, ExpenseCategory cat, String merchant, PaymentSource via, String note, boolean recurring) {
        LocalDate date = dateIn(ym, day);
        if (date == null) return;
        Expense e = new Expense();
        e.setUserId(userId);
        e.setAmount(amount);
        e.setCategory(cat);
        e.setMerchant(merchant);
        e.setPaymentSource(via);
        e.setDate(date);
        e.setMonthKey(MonthKey.of(date));
        e.setNote(note);
        e.setRecurring(recurring);
        e.setExpiresAt(expiresAt);
        expenses.add(e);
    }

    /** Only dates that have already happened, so the current month looks "in progress". */
    private LocalDate dateIn(YearMonth ym, int day) {
        LocalDate date = ym.atDay(Math.min(day, ym.lengthOfMonth()));
        return date.isAfter(today) ? null : date;
    }

    /** Random amount with realistic paise for small-ticket spends. */
    private BigDecimal between(int lo, int hi) {
        BigDecimal v = BigDecimal.valueOf(lo + rnd.nextInt(hi - lo + 1));
        if (hi < 1_000 && chance(0.4)) v = v.add(BigDecimal.valueOf(rnd.nextInt(100), 2));
        return v.setScale(2, RoundingMode.HALF_UP);
    }

    private boolean chance(double p) {
        return rnd.nextDouble() < p;
    }

    private String pick(String... options) {
        return options[rnd.nextInt(options.length)];
    }
}
