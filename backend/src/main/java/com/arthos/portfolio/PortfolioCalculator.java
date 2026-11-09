package com.arthos.portfolio;

import com.arthos.market.MarketTypes.PricePoint;
import com.arthos.market.MarketTypes.Quote;
import com.arthos.portfolio.Holding.AssetClass;
import com.arthos.portfolio.Holding.Horizon;
import com.arthos.portfolio.Holding.Lot;
import com.arthos.portfolio.Holding.LotType;
import com.arthos.portfolio.PortfolioView.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * The portfolio engine (blueprint §9), pure over holdings + market data so it is testable and independent of any
 * particular price source (§13.1).
 *
 * <ul>
 *   <li>Cost basis uses the average-cost method; sells realise (price − average cost) × quantity.</li>
 *   <li>Price per unit: manual override → live quote (gold × purity) → face value (bonds) → last trade price.</li>
 *   <li>XIRR uses every buy/sell as a cash flow plus today's value as the final inflow.</li>
 *   <li>History is rebuilt day by day from the lots and historical prices, so trend lines work from day one.</li>
 * </ul>
 */
public final class PortfolioCalculator {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final int MAX_POINTS = 260;

    private PortfolioCalculator() {}

    public static PortfolioView calculate(List<Holding> holdings, Map<String, Quote> quotes,
                                          Map<String, List<PricePoint>> histories, LocalDate today, String range) {
        List<Computed> computed = holdings.stream().map(h -> compute(h, quotes, histories, today)).toList();

        BigDecimal value = sum(computed, c -> c.value), invested = sum(computed, c -> c.invested);
        BigDecimal dayChange = sum(computed, c -> c.dayChange), realized = sum(computed, c -> c.realized);
        BigDecimal prevValue = value.subtract(dayChange);
        List<Xirr.Flow> allFlows = new ArrayList<>();
        computed.forEach(c -> allFlows.addAll(c.flows));
        if (value.signum() > 0) allFlows.add(new Xirr.Flow(today, value.doubleValue()));

        Totals totals = new Totals(m(value), m(invested), m(value.subtract(invested)), pct(value.subtract(invested), invested),
                m(dayChange), pct(dayChange, prevValue), m(realized), rate(Xirr.of(allFlows)), holdings.size());

        Map<AssetClass, List<Computed>> byClass = new EnumMap<>(AssetClass.class);
        computed.forEach(c -> byClass.computeIfAbsent(c.h.getAssetClass(), k -> new ArrayList<>()).add(c));
        List<ClassSlice> allocation = byClass.entrySet().stream().map(e -> {
            BigDecimal v = sum(e.getValue(), c -> c.value), inv = sum(e.getValue(), c -> c.invested);
            return new ClassSlice(e.getKey(), m(v), m(inv), m(v.subtract(inv)), pct(v.subtract(inv), inv), pct(v, value), e.getValue().size());
        }).sorted(Comparator.comparing(ClassSlice::value).reversed()).toList();

        Map<Horizon, List<Computed>> byH = new HashMap<>();
        computed.forEach(c -> byH.computeIfAbsent(c.h.getHorizon(), k -> new ArrayList<>()).add(c));
        List<HorizonSlice> horizons = byH.entrySet().stream()
                .map(e -> new HorizonSlice(e.getKey(), m(sum(e.getValue(), c -> c.value)), pct(sum(e.getValue(), c -> c.value), value), e.getValue().size()))
                .sorted(Comparator.comparing(HorizonSlice::value).reversed()).toList();

        List<HoldingView> views = computed.stream().map(c -> c.view(value)).sorted(Comparator.comparing(HoldingView::currentValue).reversed()).toList();

        Instant asOf = computed.stream().filter(c -> c.source == PriceSource.LIVE && c.asOf != null).map(c -> c.asOf).min(Instant::compareTo).orElse(null);
        List<String> notes = computed.stream().filter(c -> c.source == PriceSource.COST && c.h.marketKey() != null)
                .map(c -> "No live price for " + c.h.getName() + " right now; valued at its last trade price.").toList();

        return new PortfolioView(totals, allocation, horizons, views, history(computed, today, range), range, asOf, notes);
    }

    // ---------------------------------------------------------------- per holding

    private static final class Computed {
        Holding h;
        BigDecimal qty = BigDecimal.ZERO, invested = BigDecimal.ZERO, realized = BigDecimal.ZERO;
        BigDecimal price, prev, value = BigDecimal.ZERO, dayChange = BigDecimal.ZERO;
        PriceSource source;
        Instant asOf;
        List<Xirr.Flow> flows = new ArrayList<>();
        List<Lot> lots;
        TreeMap<LocalDate, BigDecimal> prices = new TreeMap<>(); // adjusted per-unit closes
        LocalDate today;

        HoldingView view(BigDecimal total) {
            BigDecimal gain = value.subtract(invested);
            List<Xirr.Flow> f = new ArrayList<>(flows);
            if (value.signum() > 0) f.add(new Xirr.Flow(today, value.doubleValue()));
            List<BigDecimal> spark = prices.isEmpty() ? List.of()
                    : prices.tailMap(today.minusDays(45), true).values().stream().map(PortfolioCalculator::m).toList();
            return new HoldingView(h.getId(), h.getAssetClass(), h.getName(), h.getSymbol(), h.getExchange(),
                    qty.stripTrailingZeros(), qty.signum() > 0 ? invested.divide(qty, 4, RoundingMode.HALF_UP) : BigDecimal.ZERO, m(invested),
                    price.setScale(4, RoundingMode.HALF_UP).stripTrailingZeros(), source, asOf, prev == null ? null : prev.setScale(4, RoundingMode.HALF_UP).stripTrailingZeros(),
                    m(value), m(gain), pct(gain, invested), m(dayChange), pct(dayChange, value.subtract(dayChange)), m(realized),
                    rate(Xirr.of(f)), pct(value, total), h.getGoal(), h.getHorizon(), h.getManualPrice(), h.getNotes(),
                    lots.isEmpty() ? null : lots.getFirst().getDate(), gold(), bond(), spark,
                    lots.stream().map(l -> new LotView(l.getId(), l.getType(), l.getDate(), l.getQuantity().stripTrailingZeros(), l.getPrice(),
                            m(l.getQuantity().multiply(l.getPrice())), l.getNote(), l.fundedFrom(),
                            l.getType() == LotType.SELL ? null : m(l.fromSavings()), l.getType() == LotType.SELL ? null : m(l.fromSpending()), l.getImportSource())).toList());
        }

        GoldInfo gold() {
            if (h.getAssetClass() != AssetClass.GOLD) return null;
            BigDecimal factor = h.getPurity() == null ? BigDecimal.ONE : h.getPurity().factor;
            return new GoldInfo(h.getGoldForm(), h.getPurity(), qty.stripTrailingZeros(),
                    factor.signum() > 0 ? price.divide(factor, 2, RoundingMode.HALF_UP) : price);
        }

        BondInfo bond() {
            if (h.getAssetClass() != AssetClass.BOND || h.getFaceValue() == null) return null;
            BigDecimal rate = h.getCouponRate() == null ? BigDecimal.ZERO : h.getCouponRate();
            BigDecimal annual = qty.multiply(h.getFaceValue()).multiply(rate).divide(HUNDRED, 2, RoundingMode.HALF_UP);
            LocalDate next = null;
            BigDecimal years = null;
            if (h.getMaturityDate() != null && h.getMaturityDate().isAfter(today)) {
                next = h.getMaturityDate();
                while (next.minusMonths(6).isAfter(today)) next = next.minusMonths(6);
                years = BigDecimal.valueOf(ChronoUnit.DAYS.between(today, h.getMaturityDate()) / 365.25).setScale(1, RoundingMode.HALF_UP);
            }
            BigDecimal yield = price.signum() > 0
                    ? rate.multiply(h.getFaceValue()).divide(price, 2, RoundingMode.HALF_UP) : null;
            return new BondInfo(h.getFaceValue(), rate, h.getMaturityDate(), h.getBondType(), annual, next, years, yield);
        }
    }

    private static Computed compute(Holding h, Map<String, Quote> quotes, Map<String, List<PricePoint>> histories, LocalDate today) {
        Computed c = new Computed();
        c.h = h;
        c.today = today;
        c.lots = sortedLots(h);
        for (Lot l : c.lots) {
            if (l.getDate().isAfter(today)) continue;
            BigDecimal q = l.getQuantity(), p = l.getPrice();
            if (l.getType() == LotType.BUY) {
                c.qty = c.qty.add(q);
                c.invested = c.invested.add(q.multiply(p));
                c.flows.add(new Xirr.Flow(l.getDate(), -q.multiply(p).doubleValue()));
            } else {
                BigDecimal sold = q.min(c.qty);
                BigDecimal avg = c.qty.signum() > 0 ? c.invested.divide(c.qty, 10, RoundingMode.HALF_UP) : BigDecimal.ZERO;
                c.invested = c.invested.subtract(avg.multiply(sold));
                c.realized = c.realized.add(p.subtract(avg).multiply(sold));
                c.qty = c.qty.subtract(sold);
                c.flows.add(new Xirr.Flow(l.getDate(), sold.multiply(p).doubleValue()));
            }
        }

        BigDecimal factor = h.getAssetClass() == AssetClass.GOLD && h.getPurity() != null ? h.getPurity().factor : BigDecimal.ONE;
        String key = h.marketKey();
        for (PricePoint p : key == null ? List.<PricePoint>of() : histories.getOrDefault(key, List.of())) {
            c.prices.put(p.date(), p.close().multiply(factor));
        }
        Quote q = key == null ? null : quotes.get(key);
        if (h.getManualPrice() != null) {
            c.price = h.getManualPrice();
            c.source = PriceSource.MANUAL;
        } else if (q != null) {
            c.price = q.price().multiply(factor);
            c.prev = q.previousClose() == null ? null : q.previousClose().multiply(factor);
            c.source = PriceSource.LIVE;
            c.asOf = q.asOf();
        } else if (h.getAssetClass() == AssetClass.BOND && h.getFaceValue() != null) {
            c.price = h.getFaceValue();
            c.source = PriceSource.FACE_VALUE;
        } else {
            c.price = c.prices.isEmpty() ? (c.lots.isEmpty() ? BigDecimal.ZERO : c.lots.getLast().getPrice()) : c.prices.lastEntry().getValue();
            c.source = PriceSource.COST;
        }
        c.value = c.qty.multiply(c.price);
        if (c.source == PriceSource.LIVE && c.prev != null) c.dayChange = c.qty.multiply(c.price.subtract(c.prev));
        return c;
    }

    private static List<Lot> sortedLots(Holding h) {
        List<Lot> lots = new ArrayList<>(h.getLots() == null ? List.of() : h.getLots());
        lots.sort(Comparator.comparing(Lot::getDate).thenComparing(l -> l.getType() == LotType.SELL ? 1 : 0));
        return lots;
    }

    // ---------------------------------------------------------------- history

    static LocalDate rangeStart(String range, LocalDate today, LocalDate firstLot) {
        return switch (range == null ? "1Y" : range) {
            case "1M" -> today.minusMonths(1);
            case "3M" -> today.minusMonths(3);
            case "6M" -> today.minusMonths(6);
            case "ALL" -> firstLot == null ? today.minusYears(1) : firstLot;
            default -> today.minusYears(1);
        };
    }

    private static List<HistoryPoint> history(List<Computed> cs, LocalDate today, String range) {
        LocalDate first = cs.stream().filter(c -> !c.lots.isEmpty()).map(c -> c.lots.getFirst().getDate()).min(LocalDate::compareTo).orElse(null);
        if (first == null) return List.of();
        LocalDate start = rangeStart(range, today, first);
        if (start.isBefore(first)) start = first;
        long days = ChronoUnit.DAYS.between(start, today);
        long step = Math.max(1, (days + MAX_POINTS - 1) / MAX_POINTS);

        List<HistoryPoint> out = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(today); d = d.plusDays(step)) out.add(pointAt(cs, d, today));
        if (out.isEmpty() || !out.getLast().date().equals(today)) out.add(pointAt(cs, today, today));
        return out;
    }

    private static HistoryPoint pointAt(List<Computed> cs, LocalDate d, LocalDate today) {
        BigDecimal value = BigDecimal.ZERO, invested = BigDecimal.ZERO;
        for (Computed c : cs) {
            BigDecimal qty = BigDecimal.ZERO, cost = BigDecimal.ZERO, lastTrade = null;
            for (Lot l : c.lots) {
                if (l.getDate().isAfter(d)) break;
                lastTrade = l.getPrice();
                if (l.getType() == LotType.BUY) {
                    qty = qty.add(l.getQuantity());
                    cost = cost.add(l.getQuantity().multiply(l.getPrice()));
                } else {
                    BigDecimal sold = l.getQuantity().min(qty);
                    BigDecimal avg = qty.signum() > 0 ? cost.divide(qty, 10, RoundingMode.HALF_UP) : BigDecimal.ZERO;
                    cost = cost.subtract(avg.multiply(sold));
                    qty = qty.subtract(sold);
                }
            }
            if (qty.signum() == 0) continue;
            BigDecimal price;
            if (d.equals(today)) price = c.price;
            else if (c.source == PriceSource.MANUAL || c.source == PriceSource.FACE_VALUE) price = c.price;
            else {
                var e = c.prices.floorEntry(d);
                price = e != null ? e.getValue() : (lastTrade != null ? lastTrade : c.price);
            }
            value = value.add(qty.multiply(price));
            invested = invested.add(cost);
        }
        return new HistoryPoint(d, m(value), m(invested));
    }

    // ---------------------------------------------------------------- helpers

    private interface Getter { BigDecimal get(Computed c); }

    private static BigDecimal sum(List<Computed> cs, Getter g) {
        BigDecimal s = BigDecimal.ZERO;
        for (Computed c : cs) s = s.add(g.get(c));
        return s;
    }

    static BigDecimal m(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal pct(BigDecimal part, BigDecimal whole) {
        return whole == null || whole.signum() == 0 ? null : part.multiply(HUNDRED).divide(whole, 2, RoundingMode.HALF_UP);
    }

    private static BigDecimal rate(Double r) {
        return r == null ? null : BigDecimal.valueOf(r * 100).setScale(2, RoundingMode.HALF_UP);
    }
}
