package com.arthos.market;

import com.arthos.market.MarketTypes.PricePoint;
import com.arthos.market.MarketTypes.Quote;
import com.arthos.portfolio.Holding.AssetClass;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.TreeMap;

/**
 * Gold in INR per gram (24K), derived from international spot (COMEX gold futures, USD/troy oz) and USD/INR.
 * This excludes Indian import duty and GST, so it reads a little below jeweller prices; users can set a manual price
 * on a holding if they prefer a local rate.
 */
@Component
public class GoldPriceProvider implements PriceProvider {

    private static final BigDecimal GRAMS_PER_OZ = new BigDecimal("31.1034768");
    private final YahooPriceProvider yahoo;

    public GoldPriceProvider(YahooPriceProvider yahoo) {
        this.yahoo = yahoo;
    }

    @Override
    public AssetClass assetClass() {
        return AssetClass.GOLD;
    }

    @Override
    public Optional<Quote> quote(String ignored) {
        List<PricePoint> h = history(ignored, "5d");
        if (h.isEmpty()) return Optional.empty();
        BigDecimal prev = h.size() >= 2 ? h.get(h.size() - 2).close() : null;
        return Optional.of(new Quote(h.getLast().close(), prev, Instant.now(), "Spot (COMEX × USD/INR)"));
    }

    @Override
    public List<PricePoint> history(String ignored) {
        return history(ignored, "2y");
    }

    private List<PricePoint> history(String ignored, String range) {
        var gold = yahoo.chart("GC=F", range).map(YahooPriceProvider::closes).orElse(List.of());
        var fx = yahoo.chart("USDINR=X", range).map(YahooPriceProvider::closes).orElse(List.of());
        if (gold.isEmpty() || fx.isEmpty()) return List.of();
        TreeMap<LocalDate, BigDecimal> fxByDate = new TreeMap<>();
        fx.forEach(p -> fxByDate.put(p.date(), p.close()));
        List<PricePoint> out = new ArrayList<>();
        for (PricePoint g : gold) {
            var rate = fxByDate.floorEntry(g.date());
            if (rate == null) continue;
            out.add(new PricePoint(g.date(), g.close().multiply(rate.getValue()).divide(GRAMS_PER_OZ, 2, RoundingMode.HALF_UP)));
        }
        return out;
    }
}
