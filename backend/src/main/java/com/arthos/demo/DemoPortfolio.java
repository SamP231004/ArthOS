package com.arthos.demo;

import com.arthos.market.MarketTypes.PricePoint;
import com.arthos.portfolio.Holding;
import com.arthos.portfolio.Holding.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * A realistic demo portfolio: Indian large caps, an ETF, SIPs into real mutual funds, digital gold + SGBs, and bonds.
 * Purchase prices come from real historical prices on each purchase date when available, so gains look genuine;
 * otherwise a fixed fallback price is used. Pure: pass the price histories in.
 */
public final class DemoPortfolio {

    record Spec(AssetClass cls, String symbol, String name, String exchange, Horizon horizon, String goal, double fallbackPrice) {}

    static final List<Spec> SPECS = List.of(
            new Spec(AssetClass.STOCK, "RELIANCE.NS", "Reliance Industries", "NSE", Horizon.LONG, "Retirement", 1250),
            new Spec(AssetClass.STOCK, "TCS.NS", "Tata Consultancy Services", "NSE", Horizon.LONG, "Retirement", 3500),
            new Spec(AssetClass.STOCK, "HDFCBANK.NS", "HDFC Bank", "NSE", Horizon.LONG, null, 1700),
            new Spec(AssetClass.STOCK, "INFY.NS", "Infosys", "NSE", Horizon.MEDIUM, null, 1600),
            new Spec(AssetClass.STOCK, "NIFTYBEES.NS", "Nippon India ETF Nifty BeES", "NSE", Horizon.LONG, "Retirement", 270),
            new Spec(AssetClass.MUTUAL_FUND, "122639", "Parag Parikh Flexi Cap Fund - Direct Growth", "AMFI", Horizon.LONG, "Retirement", 85),
            new Spec(AssetClass.MUTUAL_FUND, "120716", "UTI Nifty 50 Index Fund - Direct Growth", "AMFI", Horizon.LONG, null, 165),
            new Spec(AssetClass.MUTUAL_FUND, "125354", "Axis Small Cap Fund - Direct Growth", "AMFI", Horizon.MEDIUM, null, 110),
            new Spec(AssetClass.MUTUAL_FUND, "118968", "HDFC Balanced Advantage Fund - Direct Growth", "AMFI", Horizon.MEDIUM, "House down payment", 520));

    private DemoPortfolio() {}

    /** Market keys whose histories should be fetched before {@link #build}. */
    public static List<String> marketKeys() {
        List<String> keys = new ArrayList<>(SPECS.stream().map(s -> s.cls() + ":" + s.symbol()).toList());
        keys.add("GOLD:XAU");
        return keys;
    }

    public static List<Holding> build(String userId, LocalDate today, Instant expiresAt, Map<String, List<PricePoint>> histories) {
        List<Holding> out = new ArrayList<>();
        Map<String, Spec> by = new HashMap<>();
        SPECS.forEach(s -> by.put(s.symbol(), s));

        out.add(stock(by.get("RELIANCE.NS"), histories, today, buy(14, 25), buy(5, 10)));
        out.add(stock(by.get("TCS.NS"), histories, today, buy(11, 8)));
        out.add(stock(by.get("HDFCBANK.NS"), histories, today, buy(9, 30)));
        out.add(stock(by.get("INFY.NS"), histories, today, buy(13, 20), sell(3, 5)));
        out.add(stock(by.get("NIFTYBEES.NS"), histories, today, buy(7, 150)));

        out.add(sip(by.get("122639"), histories, today, 10_000, 18));
        out.add(sip(by.get("120716"), histories, today, 5_000, 12));
        out.add(lump(by.get("125354"), histories, today, 40_000, 10));
        out.add(lump(by.get("118968"), histories, today, 25_000, 6));

        // Gold: 3 × 2 g of digital gold, plus 6 sovereign gold bond units (1 unit = 1 g) — about a fifth of the portfolio.
        Holding digital = base(AssetClass.GOLD, "XAU", "Digital gold (24K)", null, Horizon.MEDIUM, "Wedding");
        digital.setGoldForm(GoldForm.DIGITAL);
        digital.setPurity(GoldPurity.K24);
        for (int m : new int[]{10, 6, 2}) digital.getLots().add(lot(LotType.BUY, monthsAgo(today, m), 2, priceAt(histories, "GOLD:XAU", monthsAgo(today, m), 9_500)));
        out.add(digital);

        Holding sgb = base(AssetClass.GOLD, "XAU", "Sovereign Gold Bond 2025-26 Series I", null, Horizon.LONG, null);
        sgb.setGoldForm(GoldForm.SGB);
        sgb.setPurity(GoldPurity.K24);
        sgb.getLots().add(lot(LotType.BUY, monthsAgo(today, 15), 6, priceAt(histories, "GOLD:XAU", monthsAgo(today, 15), 8_800)));
        out.add(sgb);

        Holding gsec = base(AssetClass.BOND, null, "GOI 7.18% 2033 (G-Sec)", "RBI Retail Direct", Horizon.LONG, null);
        gsec.setBondType(BondType.GOVERNMENT);
        gsec.setFaceValue(BigDecimal.valueOf(100));
        gsec.setCouponRate(new BigDecimal("7.18"));
        gsec.setMaturityDate(LocalDate.of(2033, 7, 24));
        gsec.setManualPrice(new BigDecimal("102.30"));
        gsec.getLots().add(lot(LotType.BUY, monthsAgo(today, 8), 200, new BigDecimal("101.50")));
        out.add(gsec);

        Holding ncd = base(AssetClass.BOND, null, "AAA Corporate NCD 8.40% 2028", "NSE", Horizon.SHORT, "Emergency buffer");
        ncd.setBondType(BondType.CORPORATE);
        ncd.setFaceValue(BigDecimal.valueOf(1000));
        ncd.setCouponRate(new BigDecimal("8.40"));
        ncd.setMaturityDate(LocalDate.of(2028, 3, 15));
        ncd.getLots().add(lot(LotType.BUY, monthsAgo(today, 5), 20, BigDecimal.valueOf(1000)));
        out.add(ncd);

        out.forEach(h -> {
            h.setUserId(userId);
            h.setExpiresAt(expiresAt);
        });
        return out;
    }

    // ---- builders

    private record Trade(LotType type, int monthsAgo, double qty) {}

    private static Trade buy(int monthsAgo, double qty) {
        return new Trade(LotType.BUY, monthsAgo, qty);
    }

    private static Trade sell(int monthsAgo, double qty) {
        return new Trade(LotType.SELL, monthsAgo, qty);
    }

    private static Holding stock(Spec s, Map<String, List<PricePoint>> hist, LocalDate today, Trade... trades) {
        Holding h = base(s.cls(), s.symbol(), s.name(), s.exchange(), s.horizon(), s.goal());
        String key = s.cls() + ":" + s.symbol();
        for (Trade t : trades) {
            LocalDate d = monthsAgo(today, t.monthsAgo());
            BigDecimal p = priceAt(hist, key, d, s.fallbackPrice());
            // sells happen a little above the price the shares were bought at, if history is missing
            h.getLots().add(lot(t.type(), d, t.qty(), p));
        }
        return h;
    }

    private static Holding sip(Spec s, Map<String, List<PricePoint>> hist, LocalDate today, double monthly, int months) {
        Holding h = base(s.cls(), s.symbol(), s.name(), s.exchange(), s.horizon(), s.goal());
        String key = s.cls() + ":" + s.symbol();
        for (int m = months; m >= 1; m--) {
            LocalDate d = monthsAgo(today, m).withDayOfMonth(5);
            if (d.isAfter(today)) continue;
            BigDecimal nav = priceAt(hist, key, d, s.fallbackPrice());
            h.getLots().add(new Lot(UUID.randomUUID().toString(), LotType.BUY, d,
                    BigDecimal.valueOf(monthly).divide(nav, 3, RoundingMode.DOWN), nav, "SIP"));
        }
        return h;
    }

    private static Holding lump(Spec s, Map<String, List<PricePoint>> hist, LocalDate today, double amount, int monthsAgo) {
        Holding h = base(s.cls(), s.symbol(), s.name(), s.exchange(), s.horizon(), s.goal());
        LocalDate d = monthsAgo(today, monthsAgo);
        BigDecimal nav = priceAt(hist, s.cls() + ":" + s.symbol(), d, s.fallbackPrice());
        h.getLots().add(new Lot(UUID.randomUUID().toString(), LotType.BUY, d,
                BigDecimal.valueOf(amount).divide(nav, 3, RoundingMode.DOWN), nav, "Lump sum"));
        return h;
    }

    private static Holding base(AssetClass cls, String symbol, String name, String exchange, Horizon horizon, String goal) {
        Holding h = new Holding();
        h.setAssetClass(cls);
        h.setSymbol(symbol);
        h.setName(name);
        h.setExchange(exchange);
        h.setHorizon(horizon);
        h.setGoal(goal);
        return h;
    }

    private static Lot lot(LotType type, LocalDate d, double qty, BigDecimal price) {
        return new Lot(UUID.randomUUID().toString(), type, d, BigDecimal.valueOf(qty), price.setScale(2, RoundingMode.HALF_UP), null);
    }

    private static LocalDate monthsAgo(LocalDate today, int m) {
        return today.minusMonths(m);
    }

    /** Close on or before the date; fallback if no history covers it. */
    static BigDecimal priceAt(Map<String, List<PricePoint>> hist, String key, LocalDate d, double fallback) {
        List<PricePoint> h = hist.getOrDefault(key, List.of());
        PricePoint best = null;
        for (PricePoint p : h) {
            if (p.date().isAfter(d)) break;
            best = p;
        }
        if (best == null && !h.isEmpty() && !h.getFirst().date().isAfter(d.plusDays(10))) best = h.getFirst();
        return best != null ? best.close().setScale(4, RoundingMode.HALF_UP) : BigDecimal.valueOf(fallback);
    }
}
