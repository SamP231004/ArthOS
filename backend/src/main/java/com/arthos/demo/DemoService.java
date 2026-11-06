package com.arthos.demo;

import com.arthos.budget.Budget;
import com.arthos.budget.BudgetController;
import com.arthos.budget.BudgetMode;
import com.arthos.budget.BudgetRepository;
import com.arthos.expense.ExpenseRepository;
import com.arthos.market.MarketDataService;
import com.arthos.market.MarketTypes;
import com.arthos.portfolio.Holding;
import com.arthos.portfolio.HoldingRepository;
import com.arthos.savings.SavingsAccount;
import com.arthos.savings.SavingsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.arthos.income.IncomeRepository;
import com.arthos.user.User;
import com.arthos.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
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
        u.setSavingsMode(com.arthos.user.SavingsRule.Mode.PERCENT);
        u.setSavingsValue(java.math.BigDecimal.valueOf(20));
        u.setDemo(true);
        u.setExpiresAt(expiresAt);
        u = users.save(u);

        LocalDate today = LocalDate.now(java.time.ZoneId.of(u.getTimezone()));
        // Seeded by the date, not randomly: every demo started on the same day (web or app) shows the same month,
        // so the two clients agree. The data still moves with the calendar each day.
        DemoData.Seed seed = DemoData.generate(u.getId(), today, expiresAt, new Random(today.toEpochDay()));
        incomes.saveAll(seed.incomes());
        expenses.saveAll(seed.expenses());

        // One adaptive budget on the first demo month; later months inherit it, as a real user's would.
        Budget b = new Budget();
        b.setUserId(u.getId());
        b.setMonthKey(YearMonth.from(today).minusMonths(DemoData.MONTHS - 1).toString());
        b.setLimit(BigDecimal.valueOf(40_000));
        b.setMode(BudgetMode.ADAPTIVE_DAILY);
        b.setExcludedCategories(BudgetController.DEFAULT_EXCLUDED);
        b.setExpiresAt(expiresAt);
        budgets.save(b);

        // Investments priced from real history on each purchase date (falls back to fixed prices if sources are down).
        try {
            var histories = market.histories(DemoPortfolio.marketKeys());
            var portfolio = DemoPortfolio.build(u.getId(), today, expiresAt, histories);
            fundFromSavings(u, portfolio, seed, today, histories.getOrDefault("GOLD:XAU", List.of()));
            holdings.saveAll(portfolio);
        } catch (Exception e) {
            log.warn("Demo portfolio skipped: {}", e.getMessage());
        }
        return u;
    }

    /**
     * Pays for the demo portfolio the way a saver would: every buy comes out of the savings account except a small gold
     * top-up this month paid from spending money (so both choices show), and the account opens with savings Samarth
     * already had — the portfolio predates the six months of tracked income — sized so it never dips below ~₹60k.
     */
    private void fundFromSavings(User u, List<Holding> portfolio, DemoData.Seed seed, LocalDate today, List<MarketTypes.PricePoint> gold) {
        LocalDate day = today.minusDays(2).isBefore(today.withDayOfMonth(1)) ? today : today.minusDays(2);
        portfolio.stream()
                .filter(h -> h.getAssetClass() == Holding.AssetClass.GOLD && h.getGoldForm() == Holding.GoldForm.DIGITAL)
                .findFirst()
                .ifPresent(h -> {
                    BigDecimal price = gold.stream().filter(p -> !p.date().isAfter(day)).reduce((x, y) -> y).map(MarketTypes.PricePoint::close)
                            .orElse(h.getLots().getLast().getPrice()).setScale(2, RoundingMode.HALF_UP);
                    Holding.Lot topUp = new Holding.Lot(UUID.randomUUID().toString(), Holding.LotType.BUY, day, new BigDecimal("0.5"), price, "Gold top-up");
                    topUp.setFundedFrom(Holding.FundingSource.SPENDING);
                    h.getLots().add(topUp);
                });
        BigDecimal low = SavingsAccount.lowestBalance(YearMonth.from(today), u.savingsRule(),
                SavingsService.incomeByMonth(seed.incomes()), SavingsService.flows(portfolio));
        BigDecimal start = low.negate().add(BigDecimal.valueOf(60_000)).max(BigDecimal.valueOf(60_000))
                .divide(BigDecimal.valueOf(1000), 0, RoundingMode.CEILING).multiply(BigDecimal.valueOf(1000));
        u.setSavingsStartingBalance(start);
        users.save(u);
    }
}
