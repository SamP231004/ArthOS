package com.arthos.portfolio;

import com.arthos.market.MarketTypes.SymbolMatch;
import com.arthos.market.YahooPriceProvider;
import com.arthos.portfolio.Holding.AssetClass;
import com.arthos.portfolio.Holding.FundingSource;
import com.arthos.portfolio.Holding.GoldForm;
import com.arthos.portfolio.Holding.GoldPurity;
import com.arthos.portfolio.Holding.Lot;
import com.arthos.portfolio.Holding.LotType;
import com.arthos.savings.SavingsAccount.FlowKind;
import com.arthos.savings.SavingsService;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class HoldingIdentityTest {

    private static Holding stock(String symbol, String name) {
        Holding h = new Holding();
        h.setAssetClass(AssetClass.STOCK);
        h.setSymbol(symbol);
        h.setName(name);
        return h;
    }

    @Test
    void sameInstrumentAcrossExchangesAndNames() {
        assertTrue(HoldingIdentity.same(stock("ETERNAL.NS", "Eternal Limited"), stock("ETERNAL.BO", "Eternal Ltd")));
        assertTrue(HoldingIdentity.same(stock("543320.BO", "Eternal Limited"), stock("ETERNAL.NS", "ETERNAL LTD.")));
        assertFalse(HoldingIdentity.same(stock("TATASTEEL.NS", "Tata Steel Limited"), stock("ETERNAL.NS", "Eternal Limited")));

        Holding g1 = new Holding(), g2 = new Holding(), g3 = new Holding();
        for (Holding g : List.of(g1, g2, g3)) {
            g.setAssetClass(AssetClass.GOLD);
            g.setGoldForm(GoldForm.DIGITAL);
            g.setPurity(GoldPurity.K24);
            g.setName("Digital gold");
        }
        g3.setPurity(GoldPurity.K22);
        assertTrue(HoldingIdentity.same(g1, g2));
        assertFalse(HoldingIdentity.same(g1, g3));
    }

    @Test
    void splitPaymentGoesToBothAccounts() {
        Lot buy = new Lot("1", LotType.BUY, LocalDate.of(2026, 11, 3), new BigDecimal("3"), new BigDecimal("75"), null); // 225
        buy.setFundedFrom(FundingSource.SAVINGS);
        buy.setSavingsAmount(new BigDecimal("150"));
        assertEquals(0, new BigDecimal("150").compareTo(buy.fromSavings()));
        assertEquals(0, new BigDecimal("75").compareTo(buy.fromSpending()));

        Holding h = stock("ETERNAL.NS", "Eternal");
        h.getLots().add(buy);
        var flows = SavingsService.flows(List.of(h));
        assertEquals(2, flows.size());
        assertTrue(flows.stream().anyMatch(f -> f.kind() == FlowKind.BUY_FROM_SAVINGS && f.amount().compareTo(new BigDecimal("150")) == 0));
        assertTrue(flows.stream().anyMatch(f -> f.kind() == FlowKind.BUY_FROM_SPENDING && f.amount().compareTo(new BigDecimal("75")) == 0));

        // older data without a split: all from the named source
        Lot old = new Lot("2", LotType.BUY, LocalDate.of(2026, 10, 3), BigDecimal.ONE, new BigDecimal("100"), null);
        old.setFundedFrom(FundingSource.SPENDING);
        assertEquals(0, BigDecimal.ZERO.compareTo(old.fromSavings()));
        assertEquals(0, new BigDecimal("100").compareTo(old.fromSpending()));
    }

    @Test
    @SuppressWarnings("unchecked")
    void searchShowsEachCompanyOncePreferringNse() throws Exception {
        Method m = YahooPriceProvider.class.getDeclaredMethod("onePerCompany", List.class);
        m.setAccessible(true);
        List<SymbolMatch> out = (List<SymbolMatch>) m.invoke(null, List.of(
                new SymbolMatch("ETERNAL.BO", "Eternal Limited", "BSE", "STOCK"),
                new SymbolMatch("ETERNAL.NS", "Eternal Limited", "NSE", "STOCK"),
                new SymbolMatch("543320.BO", "ETERNAL LTD", "BSE", "STOCK"),
                new SymbolMatch("TATASTEEL.NS", "Tata Steel Limited", "NSE", "STOCK")));
        assertEquals(List.of("ETERNAL.NS", "TATASTEEL.NS"), out.stream().map(SymbolMatch::symbol).toList());
    }
}
