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
 * A realistic, well-run demo portfolio: Indian large caps and an ETF, SIPs into real mutual funds, gold and bonds.
 *
 * <p>Everything is priced from real market history. To show what a disciplined investor's portfolio looks like (and
 * keep the demo encouraging), purchases are timed at genuine dips — the lowest close inside each buying window — and
 * the builder keeps the best performers from a wider candidate list. A partial sale books profit near a high.
 * Without history (sources down) it falls back to fixed prices. Pure: pass the histories in.
 */
public final class DemoPortfolio {

    record Spec(AssetClass cls, String symbol, String name, String exchange, Horizon horizon, String goal, double fallbackPrice) {}

    static final List<Spec> STOCKS = List.of(
            new Spec(AssetClass.STOCK, "RELIANCE.NS", "Reliance Industries", "NSE", Horizon.LONG, "Retirement", 1250),
            new Spec(AssetClass.STOCK, "BHARTIARTL.NS", "Bharti Airtel", "NSE", Horizon.LONG, "Retirement", 1600),
            new Spec(AssetClass.STOCK, "ICICIBANK.NS", "ICICI Bank", "NSE", Horizon.LONG, null, 1200),
            new Spec(AssetClass.STOCK, "SBIN.NS", "State Bank of India", "NSE", Horizon.MEDIUM, null, 780),
            new Spec(AssetClass.STOCK, "LT.NS", "Larsen & Toubro", "NSE", Horizon.LONG, null, 3400),
            new Spec(AssetClass.STOCK, "ETERNAL.NS", "Eternal (Zomato)", "NSE", Horizon.MEDIUM, null, 220),
            new Spec(AssetClass.STOCK, "M&M.NS", "Mahindra & Mahindra", "NSE", Horizon.LONG, null, 2800),
            new Spec(AssetClass.STOCK, "TITAN.NS", "Titan Company", "NSE", Horizon.LONG, null, 3200),
            new Spec(AssetClass.STOCK, "SUNPHARMA.NS", "Sun Pharmaceutical", "NSE", Horizon.MEDIUM, null, 1600),
            new Spec(AssetClass.STOCK, "HDFCBANK.NS", "HDFC Bank", "NSE", Horizon.LONG, null, 900),
            new Spec(AssetClass.STOCK, "INFY.NS", "Infosys", "NSE", Horizon.MEDIUM, null, 1500),
            new Spec(AssetClass.STOCK, "NIFTYBEES.NS", "Nippon India ETF Nifty BeES", "NSE", Horizon.LONG, "Retirement", 260));

    static final List<Spec> FUNDS = List.of(
            new Spec(AssetClass.MUTUAL_FUND, "122639", "Parag Parikh Flexi Cap Fund - Direct Growth", "AMFI", Horizon.LONG, "Retirement", 80),
            new Spec(AssetClass.MUTUAL_FUND, "147622", "Motilal Oswal Nifty Midcap 150 Index Fund - Direct Growth", "AMFI", Horizon.LONG, null, 30),
            new Spec(AssetClass.MUTUAL_FUND, "118778", "Nippon India Small Cap Fund - Direct Growth", "AMFI", Horizon.LONG, null, 160),
            new Spec(AssetClass.MUTUAL_FUND, "120828", "Quant Small Cap Fund - Direct Growth", "AMFI", Horizon.MEDIUM, null, 240),
            new Spec(AssetClass.MUTUAL_FUND, "120716", "UTI Nifty 50 Index Fund - Direct Growth", "AMFI", Horizon.LONG, null, 160),
            new Spec(AssetClass.MUTUAL_FUND, "125354", "Axis Small Cap Fund - Direct Growth", "AMFI", Horizon.MEDIUM, null, 110),
            new Spec(AssetClass.MUTUAL_FUND, "118968", "HDFC Balanced Advantage Fund - Direct Growth", "AMFI", Horizon.MEDIUM, "House down payment", 500));

    private DemoPortfolio() {}

    /** Market keys whose histories should be fetched before {@link #build}. */
    public static List<String> marketKeys() {
        List<String> keys = new ArrayList<>();
        STOCKS.forEach(s -> keys.add(key(s)));
        FUNDS.forEach(s -> keys.add(key(s)));
        keys.add("GOLD:XAU");
        return keys;
    }

    public static List<Holding> build(String userId, LocalDate today, Instant expiresAt, Map<String, List<PricePoint>> histories) {
        List<Holding> out = new ArrayList<>();

        // ---- Stocks: buy each candidate at its lowest close 15–6 months ago; keep the five best performers.
        record Pick(Spec spec, PricePoint buy, double ret) {}
        List<Pick> picks = new ArrayList<>();
        for (Spec s : STOCKS) {
            List<PricePoint> h = histories.getOrDefault(key(s), List.of());
            PricePoint buy = lowest(h, today.minusMonths(15), today.minusMonths(6));
            BigDecimal now = last(h);
            double ret = buy == null || now == null ? 0 : now.doubleValue() / buy.close().doubleValue() - 1;
            picks.add(new Pick(s, buy, ret));
        }
        picks.sort(Comparator.comparingDouble(Pick::ret).reversed());
        boolean haveHistory = picks.stream().anyMatch(p -> p.buy() != null);
        List<Pick> chosen = haveHistory ? picks.subList(0, 5) : picks.stream().filter(p -> Set.of("RELIANCE.NS", "BHARTIARTL.NS", "ICICIBANK.NS", "LT.NS", "NIFTYBEES.NS").contains(p.spec().symbol())).toList();
        for (int i = 0; i < chosen.size(); i++) {
            Pick p = chosen.get(i);
            List<PricePoint> h = histories.getOrDefault(key(p.spec()), List.of());
            Holding hd = base(p.spec());
            LocalDate d1 = p.buy() != null ? p.buy().date() : today.minusMonths(10);
            BigDecimal p1 = p.buy() != null ? p.buy().close() : BigDecimal.valueOf(p.spec().fallbackPrice());
            double qty = Math.max(1, Math.round(38_000 / p1.doubleValue()));
            hd.getLots().add(lot(LotType.BUY, d1, qty, p1, null));
            if (i < 2) { // top two also get a top-up on a later dip
                PricePoint top = lowest(h, today.minusMonths(5), today.minusMonths(1));
                if (top != null) hd.getLots().add(lot(LotType.BUY, top.date(), Math.max(1, Math.round(qty * 0.4)), top.close(), null));
            }
            if (i == 0) { // book some profit on the best performer near its high
                PricePoint high = highest(h, d1.plusDays(30), today.minusDays(20));
                if (high != null && high.close().compareTo(p1) > 0) hd.getLots().add(lot(LotType.SELL, high.date(), Math.max(1, Math.round(qty * 0.3)), high.close(), "Booked profit"));
            }
            out.add(hd);
        }

        // ---- Mutual funds: rank by 12-month return; SIPs into the top two, lump sums (at a dip) into the next two.
        record Fund(Spec spec, double ret) {}
        List<Fund> funds = new ArrayList<>();
        for (Spec s : FUNDS) {
            List<PricePoint> h = histories.getOrDefault(key(s), List.of());
            BigDecimal then = priceAt(h, today.minusMonths(12)), now = last(h);
            funds.add(new Fund(s, then == null || now == null ? 0 : now.doubleValue() / then.doubleValue() - 1));
        }
        funds.sort(Comparator.comparingDouble(Fund::ret).reversed());
        for (int i = 0; i < 4 && i < funds.size(); i++) {
            Spec s = funds.get(i).spec();
            List<PricePoint> h = histories.getOrDefault(key(s), List.of());
            Holding hd = base(s);
            if (i < 2) {
                int months = i == 0 ? 18 : 12;
                double monthly = i == 0 ? 10_000 : 6_000;
                for (int m = months; m >= 1; m--) {
                    LocalDate d = today.minusMonths(m).withDayOfMonth(5);
                    BigDecimal nav = orElse(priceAt(h, d), s.fallbackPrice());
                    hd.getLots().add(new Lot(UUID.randomUUID().toString(), LotType.BUY, d, BigDecimal.valueOf(monthly).divide(nav, 3, RoundingMode.DOWN), nav, "SIP"));
                }
            } else {
                PricePoint dip = lowest(h, today.minusMonths(12), today.minusMonths(4));
                LocalDate d = dip != null ? dip.date() : today.minusMonths(8);
                BigDecimal nav = dip != null ? dip.close() : BigDecimal.valueOf(s.fallbackPrice());
                double amount = i == 2 ? 40_000 : 25_000;
                hd.getLots().add(new Lot(UUID.randomUUID().toString(), LotType.BUY, d, BigDecimal.valueOf(amount).divide(nav, 3, RoundingMode.DOWN), nav, "Lump sum"));
            }
            out.add(hd);
        }

        // ---- Gold: digital gold accumulated on dips, plus Sovereign Gold Bonds (1 unit = 1 g).
        List<PricePoint> gold = histories.getOrDefault("GOLD:XAU", List.of());
        Holding digital = base(new Spec(AssetClass.GOLD, "XAU", "Digital gold (24K)", null, Horizon.MEDIUM, "Wedding", 9_500));
        digital.setGoldForm(GoldForm.DIGITAL);
        digital.setPurity(GoldPurity.K24);
        for (int[] w : new int[][]{{12, 9}, {9, 6}, {6, 3}}) {
            PricePoint dip = lowest(gold, today.minusMonths(w[0]), today.minusMonths(w[1]));
            digital.getLots().add(lot(LotType.BUY, dip != null ? dip.date() : today.minusMonths(w[1]), 2, dip != null ? dip.close() : BigDecimal.valueOf(9_500), null));
        }
        out.add(digital);

        Holding sgb = base(new Spec(AssetClass.GOLD, "XAU", "Sovereign Gold Bond 2025-26 Series I", null, Horizon.LONG, null, 8_800));
        sgb.setGoldForm(GoldForm.SGB);
        sgb.setPurity(GoldPurity.K24);
        PricePoint sgbBuy = lowest(gold, today.minusMonths(20), today.minusMonths(14));
        sgb.getLots().add(lot(LotType.BUY, sgbBuy != null ? sgbBuy.date() : today.minusMonths(15), 6, sgbBuy != null ? sgbBuy.close() : BigDecimal.valueOf(8_800), null));
        out.add(sgb);

        // ---- Bonds: a G-Sec bought below par (now above), and a AAA corporate NCD at par.
        Holding gsec = base(new Spec(AssetClass.BOND, null, "GOI 7.18% 2033 (G-Sec)", "RBI Retail Direct", Horizon.LONG, null, 0));
        gsec.setBondType(BondType.GOVERNMENT);
        gsec.setFaceValue(BigDecimal.valueOf(100));
        gsec.setCouponRate(new BigDecimal("7.18"));
        gsec.setMaturityDate(LocalDate.of(2033, 7, 24));
        gsec.setManualPrice(new BigDecimal("103.40"));
        gsec.getLots().add(lot(LotType.BUY, today.minusMonths(8), 200, new BigDecimal("99.20"), null));
        out.add(gsec);

        Holding ncd = base(new Spec(AssetClass.BOND, null, "AAA Corporate NCD 8.40% 2028", "NSE", Horizon.SHORT, "Emergency buffer", 0));
        ncd.setBondType(BondType.CORPORATE);
        ncd.setFaceValue(BigDecimal.valueOf(1000));
        ncd.setCouponRate(new BigDecimal("8.40"));
        ncd.setMaturityDate(LocalDate.of(2028, 3, 15));
        ncd.setManualPrice(new BigDecimal("1012.50"));
        ncd.getLots().add(lot(LotType.BUY, today.minusMonths(5), 20, BigDecimal.valueOf(1000), null));
        out.add(ncd);

        out.forEach(h -> {
            h.setUserId(userId);
            h.setExpiresAt(expiresAt);
        });
        return out;
    }

    // ---- helpers

    static String key(Spec s) {
        return s.cls() + ":" + s.symbol();
    }

    private static Holding base(Spec s) {
        Holding h = new Holding();
        h.setAssetClass(s.cls());
        h.setSymbol(s.symbol());
        h.setName(s.name());
        h.setExchange(s.exchange());
        h.setHorizon(s.horizon());
        h.setGoal(s.goal());
        return h;
    }

    private static Lot lot(LotType type, LocalDate d, double qty, BigDecimal price, String note) {
        return new Lot(UUID.randomUUID().toString(), type, d, BigDecimal.valueOf(qty), price.setScale(2, RoundingMode.HALF_UP), note);
    }

    /** Lowest close within [from, to], or null when history doesn't cover the window. */
    static PricePoint lowest(List<PricePoint> h, LocalDate from, LocalDate to) {
        PricePoint best = null;
        for (PricePoint p : h) {
            if (p.date().isBefore(from) || p.date().isAfter(to)) continue;
            if (best == null || p.close().compareTo(best.close()) < 0) best = p;
        }
        return best;
    }

    static PricePoint highest(List<PricePoint> h, LocalDate from, LocalDate to) {
        PricePoint best = null;
        for (PricePoint p : h) {
            if (p.date().isBefore(from) || p.date().isAfter(to)) continue;
            if (best == null || p.close().compareTo(best.close()) > 0) best = p;
        }
        return best;
    }

    /** Close on or before the date. */
    static BigDecimal priceAt(List<PricePoint> h, LocalDate d) {
        PricePoint best = null;
        for (PricePoint p : h) {
            if (p.date().isAfter(d)) break;
            best = p;
        }
        return best == null ? null : best.close();
    }

    private static BigDecimal last(List<PricePoint> h) {
        return h.isEmpty() ? null : h.getLast().close();
    }

    private static BigDecimal orElse(BigDecimal v, double fallback) {
        return v != null ? v : BigDecimal.valueOf(fallback);
    }

    /** Back-compat for tests: close on/before a date or a fallback. */
    static BigDecimal priceAt(Map<String, List<PricePoint>> hist, String key, LocalDate d, double fallback) {
        return orElse(priceAt(hist.getOrDefault(key, List.of()), d), fallback);
    }
}
