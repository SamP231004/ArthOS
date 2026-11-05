package com.arthos.portfolio;

import com.arthos.demo.DemoPortfolioAccess;
import com.arthos.market.MarketTypes.PricePoint;
import com.arthos.market.MarketTypes.Quote;
import com.arthos.portfolio.Holding.*;
import com.arthos.portfolio.PortfolioView.HoldingView;
import com.arthos.portfolio.PortfolioView.PriceSource;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PortfolioCalculatorTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 5);

    @Test
    void xirrMatchesKnownAnswers() {
        // ₹10,000 grows to ₹11,000 in exactly one year → 10%
        Double r = Xirr.of(List.of(new Xirr.Flow(LocalDate.of(2025, 11, 5), -10_000), new Xirr.Flow(LocalDate.of(2026, 11, 5), 11_000)));
        assertEquals(0.10, r, 1e-4);
        // Excel's documented XIRR example ≈ 37.34%
        Double ex = Xirr.of(List.of(
                new Xirr.Flow(LocalDate.of(2008, 1, 1), -10_000), new Xirr.Flow(LocalDate.of(2008, 3, 1), 2_750),
                new Xirr.Flow(LocalDate.of(2008, 10, 30), 4_250), new Xirr.Flow(LocalDate.of(2009, 2, 15), 3_250),
                new Xirr.Flow(LocalDate.of(2009, 4, 1), 2_750)));
        assertEquals(0.3734, ex, 1e-3);
        assertNull(Xirr.of(List.of(new Xirr.Flow(TODAY, -100), new Xirr.Flow(TODAY, 120)))); // < 30 days: undefined
        assertNull(Xirr.of(List.of(new Xirr.Flow(TODAY.minusYears(1), -100))));
    }

    @Test
    void averageCostRealisedGainAndDayChange() {
        Holding h = holding(AssetClass.STOCK, "INFY.NS",
                lot(LotType.BUY, "2025-11-05", "10", "1000"),
                lot(LotType.BUY, "2026-05-05", "10", "1200"),
                lot(LotType.SELL, "2026-08-05", "5", "1500"));
        Quote q = new Quote(new BigDecimal("1600"), new BigDecimal("1580"), Instant.parse("2026-11-05T10:00:00Z"), "test");
        PortfolioView v = PortfolioCalculator.calculate(List.of(h), Map.of("STOCK:INFY.NS", q), Map.of(), TODAY, "1Y");
        HoldingView hv = v.holdings().getFirst();

        assertEq("15", hv.quantity());
        assertEq("1100", hv.avgCost());          // (10×1000 + 10×1200) / 20, unchanged by selling
        assertEq("16500.00", hv.invested());     // 15 × 1100
        assertEq("24000.00", hv.currentValue()); // 15 × 1600
        assertEq("7500.00", hv.gain());
        assertEq("2000.00", hv.realizedGain());  // 5 × (1500 − 1100)
        assertEq("300.00", hv.dayChange());      // 15 × 20
        assertEquals(PriceSource.LIVE, hv.priceSource());
        assertNotNull(hv.xirr());
        assertEq("100.00", hv.share());
        assertEquals(1, v.allocation().size());
    }

    @Test
    void goldUsesPurityAndBondsFallBackToFaceValue() {
        Holding gold = holding(AssetClass.GOLD, "XAU", lot(LotType.BUY, "2026-01-10", "10", "8000"));
        gold.setPurity(GoldPurity.K22);
        gold.setGoldForm(GoldForm.PHYSICAL);
        Holding bond = holding(AssetClass.BOND, null, lot(LotType.BUY, "2026-02-01", "20", "990"));
        bond.setFaceValue(BigDecimal.valueOf(1000));
        bond.setCouponRate(new BigDecimal("8.4"));
        bond.setMaturityDate(LocalDate.of(2028, 3, 15));

        Quote g = new Quote(new BigDecimal("12000"), null, Instant.now(), "test");
        PortfolioView v = PortfolioCalculator.calculate(List.of(gold, bond), Map.of("GOLD:XAU", g), Map.of(), TODAY, "1Y");
        HoldingView gv = v.holdings().stream().filter(x -> x.assetClass() == AssetClass.GOLD).findFirst().orElseThrow();
        HoldingView bv = v.holdings().stream().filter(x -> x.assetClass() == AssetClass.BOND).findFirst().orElseThrow();

        assertEq("10992", gv.price());            // 12,000 × 0.916
        assertEq("109920.00", gv.currentValue());
        assertEq("12000", gv.gold().pricePerGram24k());
        assertEquals(PriceSource.FACE_VALUE, bv.priceSource());
        assertEq("20000.00", bv.currentValue());
        assertEq("1680.00", bv.bond().annualCoupon()); // 20 × 1000 × 8.4%
        assertEquals(LocalDate.of(2027, 3, 15), bv.bond().nextCouponDate()); // semi-annual, counted back from maturity
        assertEq("8.40", bv.bond().currentYield());
        assertEquals(2, v.allocation().size());
    }

    @Test
    void historyIsRebuiltFromLotsAndPrices() {
        Holding h = holding(AssetClass.MUTUAL_FUND, "122639",
                lot(LotType.BUY, "2026-09-05", "100", "80"),
                lot(LotType.BUY, "2026-10-05", "100", "85"));
        List<PricePoint> hist = new ArrayList<>();
        for (LocalDate d = LocalDate.of(2026, 9, 1); !d.isAfter(TODAY); d = d.plusDays(1)) {
            hist.add(new PricePoint(d, BigDecimal.valueOf(80 + (d.toEpochDay() - LocalDate.of(2026, 9, 1).toEpochDay()) * 0.1)));
        }
        Quote q = new Quote(hist.getLast().close(), hist.get(hist.size() - 2).close(), Instant.now(), "test");
        PortfolioView v = PortfolioCalculator.calculate(List.of(h), Map.of("MUTUAL_FUND:122639", q), Map.of("MUTUAL_FUND:122639", hist), TODAY, "ALL");

        assertEquals(LocalDate.of(2026, 9, 5), v.history().getFirst().date()); // ALL starts at the first purchase
        assertEquals(TODAY, v.history().getLast().date());
        assertEq("8000.00", v.history().getFirst().invested());
        assertEq("16500.00", v.history().getLast().invested());
        assertEquals(v.totals().value(), v.history().getLast().value());
        assertFalse(v.holdings().getFirst().spark().isEmpty());
    }

    @Test
    void missingQuoteFallsBackToLastTradeWithANote() {
        Holding h = holding(AssetClass.STOCK, "XYZ.NS", lot(LotType.BUY, "2026-06-01", "4", "250"));
        PortfolioView v = PortfolioCalculator.calculate(List.of(h), Map.of(), Map.of(), TODAY, "1Y");
        assertEquals(PriceSource.COST, v.holdings().getFirst().priceSource());
        assertEq("1000.00", v.totals().value());
        assertEquals(1, v.priceNotes().size());
    }

    @Test
    void demoPortfolioBuysDipsKeepsWinnersAndEndsPositive() {
        // Two years of daily closes: every candidate trends up with a dip, except INFY which falls.
        java.util.Map<String, List<PricePoint>> hist = new java.util.HashMap<>();
        for (String k : DemoPortfolioAccess.marketKeys()) {
            boolean falling = k.equals("STOCK:INFY.NS");
            List<PricePoint> h = new ArrayList<>();
            for (LocalDate d = TODAY.minusYears(2); !d.isAfter(TODAY); d = d.plusDays(1)) {
                long t = d.toEpochDay() - TODAY.minusYears(2).toEpochDay();
                double base = falling ? 2000 - t * 1.2 : 100 + t * 0.25;
                double dip = Math.abs(t - 400) < 20 ? -15 : 0; // a clear dip ~10 months before today
                h.add(new PricePoint(d, BigDecimal.valueOf(Math.max(5, base + dip))));
            }
            hist.put(k, h);
        }
        var holdings = DemoPortfolioAccess.build("u1", TODAY, Instant.now(), hist);

        assertEquals(java.util.Set.of(AssetClass.values()), holdings.stream().map(Holding::getAssetClass).collect(java.util.stream.Collectors.toSet()));
        assertTrue(holdings.stream().noneMatch(h -> "INFY.NS".equals(h.getSymbol())), "losers are left out");
        assertTrue(holdings.stream().flatMap(h -> h.getLots().stream()).noneMatch(l -> l.getDate().isAfter(TODAY)));
        assertTrue(holdings.stream().allMatch(h -> "u1".equals(h.getUserId()) && h.getExpiresAt() != null));
        assertTrue(holdings.stream().anyMatch(h -> h.getLots().stream().anyMatch(l -> l.getType() == LotType.SELL)), "books some profit");

        java.util.Map<String, Quote> quotes = new java.util.HashMap<>();
        hist.forEach((k, h) -> quotes.put(k, new Quote(h.getLast().close(), h.get(h.size() - 2).close(), Instant.now(), "test")));
        PortfolioView v = PortfolioCalculator.calculate(holdings, quotes, hist, TODAY, "1Y");
        assertTrue(v.totals().gain().signum() > 0, "net holdings in profit, was " + v.totals().gain());
        assertTrue(v.totals().xirr() != null && v.totals().xirr().signum() > 0, "positive XIRR, was " + v.totals().xirr());
        assertTrue(v.totals().realizedGain().signum() > 0, "realised profit positive");
    }

    @Test
    void demoPortfolioStillBuildsWithoutAnyMarketData() {
        var holdings = DemoPortfolioAccess.build("u1", TODAY, Instant.now(), java.util.Map.of());
        assertEquals(java.util.Set.of(AssetClass.values()), holdings.stream().map(Holding::getAssetClass).collect(java.util.stream.Collectors.toSet()));
        assertTrue(holdings.stream().allMatch(h -> !h.getLots().isEmpty()));
    }

    private static Holding holding(AssetClass cls, String symbol, Lot... lots) {
        Holding h = new Holding();
        h.setId(UUID.randomUUID().toString());
        h.setAssetClass(cls);
        h.setSymbol(symbol);
        h.setName(symbol == null ? "Bond" : symbol);
        h.setLots(new ArrayList<>(List.of(lots)));
        return h;
    }

    private static Lot lot(LotType t, String date, String qty, String price) {
        return new Lot(UUID.randomUUID().toString(), t, LocalDate.parse(date), new BigDecimal(qty), new BigDecimal(price), null);
    }

    private static void assertEq(String expected, BigDecimal actual) {
        assertNotNull(actual);
        assertEquals(0, new BigDecimal(expected).compareTo(actual), "expected " + expected + " but was " + actual);
    }
}
