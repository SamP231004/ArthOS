package com.arthos.insights;

import com.arthos.automation.MerchantKey;
import com.arthos.budget.BudgetStatus;
import com.arthos.expense.Expense;
import com.arthos.expense.ExpenseCategory;
import com.arthos.income.Income;
import com.arthos.savings.SavingsAccount;
import com.arthos.user.SavingsRule;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

import java.util.stream.Collectors;

/**
 * Phase 5 insights (blueprint §16): a plain-language month summary, category trends, unusual purchases, recurring
 * leakage, a financial health score with an explanation for every point, alerts and saving suggestions.
 *
 * Pure and deterministic: everything is derived from the inputs, so it's unit-tested and the same on web and app.
 * Comparisons are fair mid-month — this month so far is compared with the same days of the previous months.
 */
public final class InsightsCalculator {

    public record Input(YearMonth month, LocalDate today, String currency, SavingsRule rule,
                        /** This month and up to the 3 before it. */
                        List<Expense> expenses, List<Income> incomes,
                        BudgetStatus budget, SavingsAccount savings,
                        /** Dates of every investment purchase (for the investing-habit score). */
                        List<LocalDate> investmentDates) {}

    public record Report(String month, boolean current, List<String> summary, List<CategoryTrend> trends,
                         List<Anomaly> anomalies, Leakage leakage, Health health, List<Alert> alerts,
                         List<Suggestion> suggestions) {}

    public record CategoryTrend(ExpenseCategory category, BigDecimal thisMonth, BigDecimal typical, BigDecimal changePct) {}

    public record Anomaly(String id, String merchant, ExpenseCategory category, BigDecimal amount, LocalDate date,
                          BigDecimal typical, String reason) {}

    public record Leakage(BigDecimal monthly, BigDecimal yearly, List<RecurringItem> items, List<PriceRise> priceRises) {}

    public record RecurringItem(String name, ExpenseCategory category, BigDecimal amount, LocalDate lastDate) {}

    public record PriceRise(String name, BigDecimal before, BigDecimal now, BigDecimal changePct) {}

    public record Health(int score, String grade, String headline, List<Component> components) {}

    /** One part of the score: points earned out of max, what was measured, why it scored so, and how to improve. */
    public record Component(String key, String label, int points, int max, String value, String explanation, String tip) {}

    public enum Level { DANGER, WARN, INFO }

    /** {@code brief}: the alert in one short line, for phone notifications (title + body are for the app). */
    public record Alert(String key, Level level, String title, String body, LocalDate dueDate, String brief) {}

    public record Suggestion(String title, String body, BigDecimal monthlyImpact) {}

    private static final Set<ExpenseCategory> FIXED = EnumSet.of(ExpenseCategory.RENT, ExpenseCategory.EMI);
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH);

    private InsightsCalculator() {}

    public static Report calculate(Input in) {
        YearMonth m = in.month();
        boolean current = m.equals(YearMonth.from(in.today()));
        int cut = current ? in.today().getDayOfMonth() : m.lengthOfMonth();
        Money money = new Money(in.currency());

        List<Expense> thisMonth = in.expenses().stream().filter(e -> e.getDate() != null && YearMonth.from(e.getDate()).equals(m)).toList();
        List<YearMonth> history = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            YearMonth p = m.minusMonths(i);
            if (in.expenses().stream().anyMatch(e -> e.getDate() != null && YearMonth.from(e.getDate()).equals(p))) history.add(p);
        }

        List<CategoryTrend> trends = trends(in, m, cut, history, thisMonth);
        List<Anomaly> anomalies = anomalies(in, m, thisMonth, money);
        Leakage leakage = leakage(in, m);
        Health health = health(in, m, history, money);
        List<Alert> alerts = current ? alerts(in, m, leakage, money) : List.of();
        List<Suggestion> suggestions = suggestions(in, trends, leakage, history, money);
        List<String> summary = summary(in, m, cut, current, history, thisMonth, trends, anomalies, money);
        return new Report(m.toString(), current, summary, trends, anomalies, leakage, health, alerts, suggestions);
    }

    // ------------------------------------------------------------------ summary

    private static List<String> summary(Input in, YearMonth m, int cut, boolean current, List<YearMonth> history,
                                        List<Expense> thisMonth, List<CategoryTrend> trends, List<Anomaly> anomalies, Money money) {
        List<String> out = new ArrayList<>();
        BigDecimal spent = sum(thisMonth);
        if (thisMonth.isEmpty()) {
            out.add(current ? "No spending logged yet this month." : "No spending was logged this month.");
        } else if (!history.isEmpty()) {
            BigDecimal typical = average(history.stream().map(p -> sumUpTo(in.expenses(), p, cut)).toList());
            BigDecimal pct = pct(spent.subtract(typical), typical);
            String when = current ? "so far" : "this month";
            String point = current ? "by this point in the month" : "in a typical month";
            if (pct == null || pct.abs().compareTo(BigDecimal.valueOf(5)) < 0) {
                out.add("You've spent " + money.f(spent) + " " + when + " — about the same as usual " + point + ".");
            } else {
                out.add("You've spent " + money.f(spent) + " " + when + " — " + pct.abs().setScale(0, RoundingMode.HALF_UP) + "% "
                        + (pct.signum() > 0 ? "more" : "less") + " than usual " + point + " (" + money.f(typical) + ").");
            }
        } else {
            out.add("You've spent " + money.f(spent) + (current ? " so far this month." : " this month.") + " Comparisons start once there's a month of history.");
        }

        // a rise that's mostly one flagged purchase is told by the anomaly list, not the trend line
        trends.stream().filter(t -> t.changePct() != null && t.changePct().compareTo(BigDecimal.valueOf(20)) >= 0
                        && t.thisMonth().subtract(t.typical()).compareTo(BigDecimal.valueOf(300)) >= 0
                        && anomalies.stream().filter(a -> a.category() == t.category()).map(Anomaly::amount).reduce(BigDecimal.ZERO, BigDecimal::add)
                                .compareTo(t.thisMonth().subtract(t.typical()).multiply(new BigDecimal("0.5"))) < 0)
                .limit(2)
                .forEach(t -> out.add(label(t.category()) + " is up " + t.changePct().setScale(0, RoundingMode.HALF_UP) + "% — "
                        + money.f(t.thisMonth()) + " against a usual " + money.f(t.typical()) + "."));
        trends.stream().filter(t -> t.changePct() != null && t.changePct().compareTo(BigDecimal.valueOf(-20)) <= 0
                        && t.typical().subtract(t.thisMonth()).compareTo(BigDecimal.valueOf(300)) >= 0)
                .findFirst()
                .ifPresent(t -> out.add(t.thisMonth().signum() == 0
                        ? "Nothing on " + label(t.category()).toLowerCase(Locale.ROOT) + " yet — usually " + money.f(t.typical()) + (current ? " by now." : " a month.")
                        : label(t.category()) + " is down " + t.changePct().abs().setScale(0, RoundingMode.HALF_UP) + "% ("
                        + money.f(t.thisMonth()) + " vs " + money.f(t.typical()) + ") — nicely done."));

        BigDecimal income = sumIncome(in.incomes(), m);
        if (income.signum() > 0) {
            BigDecimal saved = in.rule().setAside(income);
            BigDecimal fromSpending = in.savings() == null ? BigDecimal.ZERO : in.savings().investedFromSpending();
            BigDecimal left = income.subtract(saved).subtract(spent).subtract(fromSpending);
            int daysLeft = current ? m.lengthOfMonth() - cut + 1 : 0;
            if (left.signum() >= 0) {
                out.add(money.f(saved) + " saved first; " + money.f(left) + " left to spend"
                        + (daysLeft > 0 ? " for the rest of the month (" + money.f(left.divide(BigDecimal.valueOf(daysLeft), 0, RoundingMode.DOWN)) + " a day)." : "."));
            } else {
                out.add("Spending has run " + money.f(left.negate()) + " past what was left after saving " + money.f(saved) + " first.");
            }
        }

        Map<String, List<Expense>> byMerchant = thisMonth.stream().filter(e -> e.getMerchant() != null && !FIXED.contains(e.getCategory()))
                .collect(Collectors.groupingBy(e -> MerchantKey.of(e.getMerchant())));
        byMerchant.values().stream().filter(list -> list.size() >= 2).max(Comparator.comparing(InsightsCalculator::sum))
                .ifPresent(list -> out.add("Most went to " + list.getFirst().getMerchant() + ": " + money.f(sum(list)) + " across " + list.size() + " payments."));
        return out;
    }

    // ------------------------------------------------------------------ trends

    private static List<CategoryTrend> trends(Input in, YearMonth m, int cut, List<YearMonth> history, List<Expense> thisMonth) {
        Map<ExpenseCategory, BigDecimal> now = new EnumMap<>(ExpenseCategory.class);
        for (Expense e : thisMonth) if (e.getDate().getDayOfMonth() <= cut) now.merge(e.getCategory(), e.getAmount(), BigDecimal::add);
        Map<ExpenseCategory, BigDecimal> typical = new EnumMap<>(ExpenseCategory.class);
        if (!history.isEmpty()) {
            for (ExpenseCategory c : ExpenseCategory.values()) {
                BigDecimal total = BigDecimal.ZERO;
                for (YearMonth p : history) {
                    int pc = Math.min(cut, p.lengthOfMonth());
                    for (Expense e : in.expenses())
                        if (e.getCategory() == c && e.getDate() != null && YearMonth.from(e.getDate()).equals(p) && e.getDate().getDayOfMonth() <= pc)
                            total = total.add(e.getAmount());
                }
                if (total.signum() > 0) typical.put(c, total.divide(BigDecimal.valueOf(history.size()), 2, RoundingMode.HALF_UP));
            }
        }
        Set<ExpenseCategory> cats = EnumSet.noneOf(ExpenseCategory.class);
        cats.addAll(now.keySet());
        cats.addAll(typical.keySet());
        cats.removeAll(FIXED); // rent and EMIs don't move month to month — they're in the health score instead
        return cats.stream()
                .map(c -> {
                    BigDecimal a = now.getOrDefault(c, BigDecimal.ZERO), t = typical.getOrDefault(c, BigDecimal.ZERO);
                    return new CategoryTrend(c, a.setScale(2, RoundingMode.HALF_UP), t, history.isEmpty() ? null : pct(a.subtract(t), t));
                })
                .sorted(Comparator.comparing((CategoryTrend t) -> t.thisMonth().subtract(t.typical()).abs()).reversed())
                .limit(8)
                .toList();
    }

    // ------------------------------------------------------------------ anomalies

    private static List<Anomaly> anomalies(Input in, YearMonth m, List<Expense> thisMonth, Money money) {
        LocalDate from = m.atDay(1).minusMonths(3);
        List<Expense> past = in.expenses().stream().filter(e -> e.getDate() != null && e.getDate().isBefore(m.atDay(1)) && !e.getDate().isBefore(from)).toList();
        BigDecimal overallMedian = median(past.stream().map(Expense::getAmount).toList());
        List<Anomaly> out = new ArrayList<>();
        for (Expense e : thisMonth) {
            if (FIXED.contains(e.getCategory()) || e.isRecurring() || e.getAmount().compareTo(BigDecimal.valueOf(1000)) < 0) continue;
            List<BigDecimal> same = past.stream().filter(p -> p.getCategory() == e.getCategory()).map(Expense::getAmount).toList();
            String name = e.getMerchant() != null ? e.getMerchant() : label(e.getCategory());
            if (same.size() >= 4) {
                BigDecimal med = median(same);
                BigDecimal bar = med.multiply(BigDecimal.valueOf(3)).max(med.add(BigDecimal.valueOf(1000)));
                if (e.getAmount().compareTo(bar) >= 0) {
                    BigDecimal times = e.getAmount().divide(med, 1, RoundingMode.HALF_UP);
                    out.add(new Anomaly(e.getId(), name, e.getCategory(), e.getAmount(), e.getDate(), med,
                            times.stripTrailingZeros().toPlainString() + "× your usual " + label(e.getCategory()).toLowerCase(Locale.ROOT) + " spend (" + money.f(med) + ")"));
                }
            } else if (overallMedian != null && e.getAmount().compareTo(BigDecimal.valueOf(5000)) >= 0
                    && e.getAmount().compareTo(overallMedian.multiply(BigDecimal.valueOf(5))) >= 0) {
                out.add(new Anomaly(e.getId(), name, e.getCategory(), e.getAmount(), e.getDate(), overallMedian,
                        "a large one-off — your typical payment is " + money.f(overallMedian)));
            }
        }
        out.sort(Comparator.comparing(Anomaly::amount).reversed());
        return out.stream().limit(5).toList();
    }

    // ------------------------------------------------------------------ recurring leakage

    private static Leakage leakage(Input in, YearMonth m) {
        Map<String, Expense> latest = new LinkedHashMap<>();
        Map<String, Expense> previous = new HashMap<>();
        in.expenses().stream()
                .filter(e -> e.isRecurring() && e.getDate() != null && !YearMonth.from(e.getDate()).isAfter(m) && !YearMonth.from(e.getDate()).isBefore(m.minusMonths(2)))
                .sorted(Comparator.comparing(Expense::getDate).reversed())
                .forEach(e -> {
                    String k = MerchantKey.of(e.getMerchant() != null ? e.getMerchant() : e.getCategory().name());
                    if (!latest.containsKey(k)) latest.put(k, e);
                    else if (!previous.containsKey(k) && !YearMonth.from(e.getDate()).equals(YearMonth.from(latest.get(k).getDate()))) previous.put(k, e);
                });
        List<RecurringItem> items = latest.values().stream()
                .filter(e -> !FIXED.contains(e.getCategory()))
                .map(e -> new RecurringItem(e.getMerchant() != null ? e.getMerchant() : label(e.getCategory()), e.getCategory(), e.getAmount(), e.getDate()))
                .sorted(Comparator.comparing(RecurringItem::amount).reversed())
                .toList();
        BigDecimal monthly = items.stream().map(RecurringItem::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        List<PriceRise> rises = new ArrayList<>();
        latest.forEach((k, now) -> {
            Expense before = previous.get(k);
            if (before == null || before.getAmount().signum() <= 0) return;
            BigDecimal change = pct(now.getAmount().subtract(before.getAmount()), before.getAmount());
            if (change != null && change.compareTo(BigDecimal.valueOf(2)) > 0) {
                rises.add(new PriceRise(now.getMerchant() != null ? now.getMerchant() : label(now.getCategory()), before.getAmount(), now.getAmount(), change));
            }
        });
        return new Leakage(monthly.setScale(2, RoundingMode.HALF_UP), monthly.multiply(BigDecimal.valueOf(12)).setScale(2, RoundingMode.HALF_UP), items, rises);
    }

    // ------------------------------------------------------------------ health score

    private static Health health(Input in, YearMonth m, List<YearMonth> history, Money money) {
        List<YearMonth> basis = history.isEmpty() ? List.of(m) : history; // completed months are steadier than a partial one
        BigDecimal income = basis.stream().map(p -> sumIncome(in.incomes(), p)).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal spend = basis.stream().map(p -> sumMonth(in.expenses(), p)).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avgSpend = spend.divide(BigDecimal.valueOf(basis.size()), 2, RoundingMode.HALF_UP);
        String period = history.isEmpty() ? "this month" : "the last " + history.size() + (history.size() == 1 ? " month" : " months");
        List<Component> parts = new ArrayList<>();

        // 1. savings rate (30)
        if (income.signum() > 0) {
            BigDecimal rate = pct(income.subtract(spend), income);
            int pts = scale(rate.doubleValue(), 0, 30, 30);
            parts.add(new Component("savings", "Savings rate", pts, 30, rate.setScale(0, RoundingMode.HALF_UP) + "%",
                    "You kept " + rate.setScale(0, RoundingMode.HALF_UP) + "% of your income over " + period + ". 30% or more earns full marks.",
                    pts >= 30 ? "Keep it up." : "Raise your save-first rule a little, or trim your top category."));
        } else {
            parts.add(new Component("savings", "Savings rate", 0, 30, "—", "No income recorded for " + period + ", so a savings rate can't be worked out.", "Log your income."));
        }

        // 2. budget (20)
        BudgetStatus b = in.budget();
        if (b != null && b.configured() && b.limit() != null && b.limit().signum() > 0) {
            BigDecimal projected = b.projectedSpend() != null ? b.projectedSpend() : b.spentMonth();
            BigDecimal ratio = projected == null ? BigDecimal.ZERO : projected.divide(b.limit(), 3, RoundingMode.HALF_UP);
            int pts = ratio.compareTo(BigDecimal.ONE) <= 0 ? 20 : ratio.compareTo(new BigDecimal("1.1")) <= 0 ? 12 : ratio.compareTo(new BigDecimal("1.25")) <= 0 ? 6 : 0;
            BigDecimal usedPct = ratio.multiply(HUNDRED);
            String used = (usedPct.compareTo(BigDecimal.valueOf(95)) > 0 && usedPct.compareTo(BigDecimal.valueOf(105)) < 0
                    ? usedPct.setScale(1, RoundingMode.HALF_UP) : usedPct.setScale(0, RoundingMode.HALF_UP)).toPlainString();
            parts.add(new Component("budget", "Budget", pts, 20, used + "% of limit",
                    "On course to spend " + money.f(projected) + " against your " + money.f(b.limit()) + " budget.",
                    pts == 20 ? "Right on track." : "Ease off for a few days — the daily budget adapts as you do."));
        } else {
            parts.add(new Component("budget", "Budget", 8, 20, "Not set", "There's no monthly budget to measure against.", "Set a budget — it turns your month into one daily number."));
        }

        // 3. emergency cushion (20)
        BigDecimal balance = in.savings() == null ? BigDecimal.ZERO : in.savings().closing();
        if (avgSpend.signum() > 0) {
            BigDecimal months = balance.max(BigDecimal.ZERO).divide(avgSpend, 1, RoundingMode.HALF_UP);
            int pts = scale(months.doubleValue(), 0, 6, 20);
            parts.add(new Component("cushion", "Emergency cushion", pts, 20, months.stripTrailingZeros().toPlainString() + " months",
                    "Your savings account (" + money.f(balance) + ") would cover " + months.stripTrailingZeros().toPlainString() + " months of your usual spending (" + money.f(avgSpend) + "). Six months earns full marks.",
                    pts >= 20 ? "Well cushioned." : "Keep saving first — every month adds to the cushion."));
        } else {
            parts.add(new Component("cushion", "Emergency cushion", 10, 20, "—", "Not enough spending history to size a cushion yet.", "Keep logging for a month."));
        }

        // 4. investing habit (15): months with an investment in the last 6
        Set<YearMonth> invested = in.investmentDates().stream().map(YearMonth::from)
                .filter(p -> !p.isAfter(m) && p.isAfter(m.minusMonths(6))).collect(Collectors.toSet());
        int pts4 = scale(invested.size(), 0, 5, 15);
        parts.add(new Component("investing", "Investing habit", pts4, 15, invested.size() + " of 6 months",
                "You invested in " + invested.size() + " of the last 6 months. Investing in 5 or more earns full marks.",
                pts4 >= 15 ? "A steady habit." : "A small monthly SIP builds the habit."));

        // 5. fixed costs (15): rent + EMI as a share of income
        if (income.signum() > 0) {
            BigDecimal fixed = basis.stream().map(p -> in.expenses().stream()
                    .filter(e -> FIXED.contains(e.getCategory()) && e.getDate() != null && YearMonth.from(e.getDate()).equals(p))
                    .map(Expense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add)).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal share = pct(fixed, income);
            int pts = 15 - scale(share.doubleValue(), 30, 60, 15);
            parts.add(new Component("fixed", "Fixed costs", pts, 15, share.setScale(0, RoundingMode.HALF_UP) + "% of income",
                    "Rent and EMIs take " + share.setScale(0, RoundingMode.HALF_UP) + "% of your income. Up to 30% earns full marks; 60% or more earns none.",
                    pts >= 15 ? "Comfortable." : "Fixed costs are the slowest lever — worth reviewing at your next renewal."));
        } else {
            parts.add(new Component("fixed", "Fixed costs", 8, 15, "—", "No income recorded to compare fixed costs with.", "Log your income."));
        }

        int score = parts.stream().mapToInt(Component::points).sum();
        String grade = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 45 ? "Fair" : "Needs work";
        Component weakest = parts.stream().min(Comparator.comparingDouble(c -> (double) c.points() / c.max())).orElseThrow();
        String headline = score >= 80 ? "Your finances are in great shape." : "Biggest opportunity: " + weakest.label().toLowerCase(Locale.ROOT) + " — " + weakest.tip();
        return new Health(score, grade, headline, parts);
    }

    // ------------------------------------------------------------------ alerts

    private static List<Alert> alerts(Input in, YearMonth m, Leakage leakage, Money money) {
        List<Alert> out = new ArrayList<>();
        BudgetStatus b = in.budget();
        if (b != null && b.configured() && b.status() != null) {
            switch (b.status()) {
                case OVER_MONTH -> out.add(new Alert("budget-month-" + m, Level.DANGER, "Monthly budget exceeded",
                        "You're " + money.f(b.remainingMonth().negate()) + " over your " + money.f(b.limit()) + " budget.", null,
                        "Over budget by " + money.f(b.remainingMonth().negate())));
                case OVER -> out.add(new Alert("budget-day-" + in.today(), Level.WARN, "Over today's budget",
                        "You've spent " + money.f(b.spentToday()) + " today against " + money.f(b.todayAllowance()) + ". The coming days will absorb it.", null,
                        "Over today's budget by " + money.f(b.spentToday().subtract(b.todayAllowance()).max(BigDecimal.ZERO))));
                default -> {
                }
            }
            if (b.status() != BudgetStatus.Status.OVER_MONTH && b.projectedSpend() != null && b.limit() != null && b.projectedSpend().compareTo(b.limit()) > 0) {
                out.add(new Alert("budget-pace-" + m, Level.WARN, "On pace to overspend",
                        "At this pace you'll spend " + money.f(b.projectedSpend()) + " — " + money.f(b.projectedSpend().subtract(b.limit())) + " over budget.", null,
                        "On pace to overspend by " + money.f(b.projectedSpend().subtract(b.limit()))));
            }
        }
        if (in.savings() != null && in.savings().closing().signum() < 0) {
            out.add(new Alert("savings-overdrawn-" + m, Level.DANGER, "Savings account overdrawn",
                    "Investments have run " + money.f(in.savings().closing().negate()) + " ahead of what you've saved.", null,
                    "Savings overdrawn by " + money.f(in.savings().closing().negate())));
        }
        // recurring bills from last month that are due in the next 3 days (or today) and not logged yet
        YearMonth prev = m.minusMonths(1);
        Set<String> loggedThisMonth = in.expenses().stream().filter(e -> e.getDate() != null && YearMonth.from(e.getDate()).equals(m))
                .map(e -> MerchantKey.of(e.getMerchant() != null ? e.getMerchant() : e.getCategory().name())).collect(Collectors.toSet());
        in.expenses().stream()
                .filter(e -> e.isRecurring() && e.getDate() != null && YearMonth.from(e.getDate()).equals(prev))
                .forEach(e -> {
                    String k = MerchantKey.of(e.getMerchant() != null ? e.getMerchant() : e.getCategory().name());
                    if (loggedThisMonth.contains(k)) return;
                    LocalDate due = m.atDay(Math.min(e.getDate().getDayOfMonth(), m.lengthOfMonth()));
                    long days = ChronoUnit.DAYS.between(in.today(), due);
                    if (days < 0 || days > 3) return;
                    String name = e.getMerchant() != null ? e.getMerchant() : label(e.getCategory());
                    out.add(new Alert("recurring-" + k + "-" + due, Level.INFO, name + " due " + (days == 0 ? "today" : days == 1 ? "tomorrow" : "in " + days + " days"),
                            money.f(e.getAmount()) + " on " + DAY.format(due) + ", like last month.", due,
                            name + " " + money.f(e.getAmount()) + " due " + (days == 0 ? "today" : days == 1 ? "tomorrow" : "in " + days + " days")));
                });
        leakage.priceRises().forEach(r -> out.add(new Alert("price-" + MerchantKey.of(r.name()) + "-" + m, Level.INFO, r.name() + " costs more now",
                "Up from " + money.f(r.before()) + " to " + money.f(r.now()) + " (" + r.changePct().setScale(0, RoundingMode.HALF_UP) + "%).", null,
                r.name() + " now " + money.f(r.now()) + " (was " + money.f(r.before()) + ")")));
        return out;
    }

    // ------------------------------------------------------------------ suggestions

    private static List<Suggestion> suggestions(Input in, List<CategoryTrend> trends, Leakage leakage, List<YearMonth> history, Money money) {
        List<Suggestion> out = new ArrayList<>();
        trends.stream()
                .filter(t -> !FIXED.contains(t.category()) && t.changePct() != null && t.changePct().compareTo(BigDecimal.valueOf(20)) >= 0
                        && t.thisMonth().subtract(t.typical()).compareTo(BigDecimal.valueOf(500)) >= 0)
                .limit(2)
                .forEach(t -> {
                    BigDecimal save = t.thisMonth().subtract(t.typical()).setScale(0, RoundingMode.DOWN);
                    out.add(new Suggestion("Bring " + label(t.category()).toLowerCase(Locale.ROOT) + " back to usual",
                            "It's at " + money.f(t.thisMonth()) + " against a usual " + money.f(t.typical()) + " — getting back to normal frees about " + money.f(save) + ".", save));
                });
        List<RecurringItem> subs = leakage.items().stream().filter(i -> i.category() == ExpenseCategory.SUBSCRIPTIONS).toList();
        if (!subs.isEmpty()) {
            BigDecimal monthly = subs.stream().map(RecurringItem::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
            RecurringItem cheapest = subs.getLast();
            out.add(new Suggestion("Review your subscriptions",
                    subs.size() + (subs.size() == 1 ? " subscription costs " : " subscriptions cost ") + money.f(monthly) + " a month — " + money.f(monthly.multiply(BigDecimal.valueOf(12))) + " a year. Dropping one you rarely use, like "
                            + cheapest.name() + ", saves " + money.f(cheapest.amount().multiply(BigDecimal.valueOf(12))) + " a year.", cheapest.amount()));
        }
        if (in.savings() != null && !history.isEmpty()) {
            BigDecimal avgSpend = history.stream().map(p -> sumMonth(in.expenses(), p)).reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(history.size()), 2, RoundingMode.HALF_UP);
            BigDecimal idle = in.savings().closing().subtract(avgSpend.multiply(BigDecimal.valueOf(6)));
            if (avgSpend.signum() > 0 && idle.compareTo(BigDecimal.valueOf(10_000)) > 0) {
                out.add(new Suggestion("Put idle savings to work",
                        money.f(idle) + " sits in savings beyond a six-month cushion. Investing it (an index fund SIP, say) lets it grow instead of waiting.", null));
            }
        }
        if (in.budget() == null || !in.budget().configured()) {
            out.add(new Suggestion("Set a monthly budget", "A budget turns your month into one daily number and powers alerts before you overspend.", null));
        }
        return out.stream().limit(4).toList();
    }

    // ------------------------------------------------------------------ helpers

    private static BigDecimal sum(List<Expense> list) {
        return list.stream().map(Expense::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal sumMonth(List<Expense> all, YearMonth p) {
        return sum(all.stream().filter(e -> e.getDate() != null && YearMonth.from(e.getDate()).equals(p)).toList());
    }

    private static BigDecimal sumUpTo(List<Expense> all, YearMonth p, int day) {
        int d = Math.min(day, p.lengthOfMonth());
        return sum(all.stream().filter(e -> e.getDate() != null && YearMonth.from(e.getDate()).equals(p) && e.getDate().getDayOfMonth() <= d).toList());
    }

    private static BigDecimal sumIncome(List<Income> all, YearMonth p) {
        return all.stream().filter(i -> i.getDate() != null && YearMonth.from(i.getDate()).equals(p)).map(Income::getAmount)
                .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal average(List<BigDecimal> xs) {
        if (xs.isEmpty()) return BigDecimal.ZERO;
        return xs.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(xs.size()), 2, RoundingMode.HALF_UP);
    }

    private static BigDecimal median(List<BigDecimal> xs) {
        if (xs.isEmpty()) return null;
        List<BigDecimal> s = xs.stream().sorted().toList();
        int n = s.size();
        return n % 2 == 1 ? s.get(n / 2) : s.get(n / 2 - 1).add(s.get(n / 2)).divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
    }

    /** part ÷ whole × 100, or null when whole is zero. */
    private static BigDecimal pct(BigDecimal part, BigDecimal whole) {
        if (whole == null || whole.signum() == 0) return null;
        return part.multiply(HUNDRED).divide(whole, 1, RoundingMode.HALF_UP);
    }

    /** Linear points between lo (0 points) and hi (max points), clamped. */
    private static int scale(double v, double lo, double hi, int max) {
        if (v <= lo) return 0;
        if (v >= hi) return max;
        return (int) Math.round((v - lo) / (hi - lo) * max);
    }

    static String label(ExpenseCategory c) {
        String s = c.name().replace('_', ' ').toLowerCase(Locale.ROOT);
        return c == ExpenseCategory.EMI ? "EMI" : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    /** Whole-unit money for sentences: ₹1,23,456 (Indian grouping for INR). */
    record Money(String currency) {
        String f(BigDecimal v) {
            if (v == null) return "—";
            boolean inr = currency == null || currency.equals("INR");
            NumberFormat nf = NumberFormat.getNumberInstance(inr ? Locale.forLanguageTag("en-IN") : Locale.US);
            nf.setMaximumFractionDigits(0);
            String n = nf.format(v.setScale(0, RoundingMode.HALF_UP).abs());
            String symbol = inr ? "₹" : Currency.getInstance(currency).getSymbol(Locale.US);
            return (v.signum() < 0 ? "−" : "") + symbol + n;
        }
    }
}
