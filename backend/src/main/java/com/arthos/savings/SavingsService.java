package com.arthos.savings;

import com.arthos.common.Parallel;
import com.arthos.income.Income;
import com.arthos.income.IncomeRepository;
import com.arthos.portfolio.Holding;
import com.arthos.portfolio.HoldingRepository;
import com.arthos.savings.SavingsAccount.Flow;
import com.arthos.savings.SavingsAccount.FlowKind;
import com.arthos.user.User;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Builds a user's savings account from their incomes (saved first) and investment transactions. */
@Service
public class SavingsService {

    private final IncomeRepository incomes;
    private final HoldingRepository holdings;

    public SavingsService(IncomeRepository incomes, HoldingRepository holdings) {
        this.incomes = incomes;
        this.holdings = holdings;
    }

    public SavingsAccount account(User u, YearMonth month) {
        var allIncomes = Parallel.async(() -> incomes.findByUserId(u.getId()));
        var all = Parallel.async(() -> holdings.findByUserIdOrderByCreatedAtAsc(u.getId()));
        return account(u, month, Parallel.get(allIncomes), Parallel.get(all));
    }

    /** Same, from data the caller already loaded (all of the user's incomes and holdings). */
    public static SavingsAccount account(User u, YearMonth month, List<Income> allIncomes, List<Holding> allHoldings) {
        return SavingsAccount.calculate(month, u.getSavingsStartingBalance(), u.savingsRule(), incomeByMonth(allIncomes), flows(allHoldings));
    }

    public static Map<YearMonth, BigDecimal> incomeByMonth(List<Income> list) {
        Map<YearMonth, BigDecimal> out = new HashMap<>();
        for (Income i : list) {
            if (i.getDate() == null || i.getAmount() == null) continue;
            out.merge(YearMonth.from(i.getDate()), i.getAmount(), BigDecimal::add);
        }
        return out;
    }

    public static List<Flow> flows(List<Holding> list) {
        List<Flow> out = new ArrayList<>();
        for (Holding h : list) {
            if (h.getLots() == null) continue;
            for (Holding.Lot l : h.getLots()) {
                if (l.getDate() == null || l.getQuantity() == null || l.getPrice() == null) continue;
                if (l.imported()) continue; // held before ArthOS: not paid from this account, sales don't refill it
                if (l.getType() == Holding.LotType.SELL) {
                    out.add(new Flow(l.getDate(), l.getQuantity().multiply(l.getPrice()), FlowKind.SALE));
                    continue;
                }
                // a buy can be split: part from savings, the rest from spending money
                if (l.fromSavings().signum() > 0) out.add(new Flow(l.getDate(), l.fromSavings(), FlowKind.BUY_FROM_SAVINGS));
                if (l.fromSpending().signum() > 0) out.add(new Flow(l.getDate(), l.fromSpending(), FlowKind.BUY_FROM_SPENDING));
            }
        }
        return out;
    }
}
