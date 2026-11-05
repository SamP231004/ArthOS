package com.arthos.summary;

import com.arthos.auth.CurrentUser;
import com.arthos.common.ApiException;
import com.arthos.common.MonthKey;
import com.arthos.expense.ExpenseRepository;
import com.arthos.income.IncomeRepository;
import com.arthos.portfolio.Holding;
import com.arthos.portfolio.HoldingRepository;
import com.arthos.user.User;
import com.arthos.user.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

@RestController
@RequestMapping("/api/summary")
public class SummaryController {

    private final UserRepository users;
    private final IncomeRepository incomes;
    private final ExpenseRepository expenses;
    private final HoldingRepository holdings;

    public SummaryController(UserRepository users, IncomeRepository incomes, ExpenseRepository expenses, HoldingRepository holdings) {
        this.users = users;
        this.incomes = incomes;
        this.expenses = expenses;
        this.holdings = holdings;
    }

    /** Month summary for the dashboard. {@code month} is "YYYY-MM"; defaults to the current month. */
    @GetMapping
    MonthSummary month(@RequestParam(required = false) String month) {
        User user = users.findById(CurrentUser.id()).orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
        ZoneId zone = MonthKey.zoneOrDefault(user.getTimezone());
        YearMonth ym = MonthKey.parseOrCurrent(month, zone);
        String key = ym.toString();
        return MonthSummaryCalculator.calculate(
                ym, LocalDate.now(zone), user.getCurrency(), user.getMonthlyIncomeTarget(), user.savingsRule(), investedIn(user.getId(), ym),
                incomes.findByUserIdAndMonthKeyOrderByDateDescCreatedAtDesc(user.getId(), key),
                expenses.findByUserIdAndMonthKeyOrderByDateDescCreatedAtDesc(user.getId(), key));
    }

    /** Value of buy lots dated in the month: savings that were actually invested. */
    private BigDecimal investedIn(String userId, YearMonth ym) {
        BigDecimal total = BigDecimal.ZERO;
        for (Holding h : holdings.findByUserIdOrderByCreatedAtAsc(userId)) {
            if (h.getLots() == null) continue;
            for (Holding.Lot l : h.getLots()) {
                if (l.getType() != Holding.LotType.BUY || l.getDate() == null || l.getQuantity() == null || l.getPrice() == null) continue;
                if (YearMonth.from(l.getDate()).equals(ym)) total = total.add(l.getQuantity().multiply(l.getPrice()));
            }
        }
        return total.setScale(2, RoundingMode.HALF_UP);
    }
}
