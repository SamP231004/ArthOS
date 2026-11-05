package com.arthos.demo;

import com.arthos.budget.Budget;
import com.arthos.budget.BudgetController;
import com.arthos.budget.BudgetMode;
import com.arthos.budget.BudgetRepository;
import com.arthos.expense.ExpenseRepository;
import com.arthos.market.MarketDataService;
import com.arthos.portfolio.HoldingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.arthos.income.IncomeRepository;
import com.arthos.user.User;
import com.arthos.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Random;
import java.util.UUID;

/** Creates a private, pre-filled sandbox account per visitor. Everything is deleted by Mongo TTL after {@link #TTL}. */
@Service
public class DemoService {

    public static final Duration TTL = Duration.ofHours(24);

    private final UserRepository users;
    private final IncomeRepository incomes;
    private final ExpenseRepository expenses;
    private final PasswordEncoder encoder;
    private final BudgetRepository budgets;
    private final HoldingRepository holdings;
    private final MarketDataService market;
    private static final Logger log = LoggerFactory.getLogger(DemoService.class);
    private final SecureRandom random = new SecureRandom();

    public DemoService(UserRepository users, IncomeRepository incomes, ExpenseRepository expenses, PasswordEncoder encoder,
                       BudgetRepository budgets, HoldingRepository holdings, MarketDataService market) {
        this.users = users;
        this.incomes = incomes;
        this.expenses = expenses;
        this.encoder = encoder;
        this.budgets = budgets;
        this.holdings = holdings;
        this.market = market;
    }

    public User createDemoUser() {
        Instant expiresAt = Instant.now().plus(TTL);
        String tag = UUID.randomUUID().toString().substring(0, 8);

        User u = new User();
        u.setName("Samarth Patel");
        u.setEmail("demo-" + tag + "@demo.arthos.app");
        u.setPasswordHash(encoder.encode(UUID.randomUUID().toString())); // unguessable: demo accounts can't log in by password
        u.setOnboardingCompleted(true);
        u.setDemo(true);
        u.setExpiresAt(expiresAt);
        u = users.save(u);

        LocalDate today = LocalDate.now(java.time.ZoneId.of(u.getTimezone()));
        DemoData.Seed seed = DemoData.generate(u.getId(), today, expiresAt, new Random(random.nextLong()));
        incomes.saveAll(seed.incomes());
        expenses.saveAll(seed.expenses());

        // One adaptive budget on the first demo month; later months inherit it, as a real user's would.
        Budget b = new Budget();
        b.setUserId(u.getId());
        b.setMonthKey(java.time.YearMonth.from(today).minusMonths(DemoData.MONTHS - 1).toString());
        b.setLimit(BigDecimal.valueOf(40_000));
        b.setMode(BudgetMode.ADAPTIVE_DAILY);
        b.setExcludedCategories(BudgetController.DEFAULT_EXCLUDED);
        b.setExpiresAt(expiresAt);
        budgets.save(b);

        // Investments priced from real history on each purchase date (falls back to fixed prices if sources are down).
        try {
            holdings.saveAll(DemoPortfolio.build(u.getId(), today, expiresAt, market.histories(DemoPortfolio.marketKeys())));
        } catch (Exception e) {
            log.warn("Demo portfolio skipped: {}", e.getMessage());
        }
        return u;
    }
}
