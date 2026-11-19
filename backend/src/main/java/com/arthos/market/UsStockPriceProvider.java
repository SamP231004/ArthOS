package com.arthos.market;

import com.arthos.market.MarketTypes.PricePoint;
import com.arthos.market.MarketTypes.Quote;
import com.arthos.market.MarketTypes.SymbolMatch;
import com.arthos.portfolio.Holding.AssetClass;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;

/**
 * US stocks and ETFs (NASDAQ, NYSE…) via Yahoo Finance, the same free source as Indian stocks. Yahoo quotes them in
 * USD; every price here is converted to INR at that day's USD/INR rate (also from Yahoo), so the portfolio engine keeps
 * working in rupees and returns include currency moves. The quote also carries the USD price for display.
 */
@Component
public class UsStockPriceProvider implements PriceProvider {

    private static final Logger log = LoggerFactory.getLogger(UsStockPriceProvider.class);
    static final String FX = "USDINR=X";
    private static final String SEARCH = "https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=12&newsCount=0";
    /** Yahoo exchange codes for US listings → the name people know. */
    private static final Map<String, String> US_EXCHANGES = Map.of(
            "NMS", "NASDAQ", "NGM", "NASDAQ", "NCM", "NASDAQ", "NYQ", "NYSE", "ASE", "NYSE American", "PCX", "NYSE Arca", "BTS", "Cboe");
    private static final Set<String> TYPES = Set.of("EQUITY", "ETF");

    private final YahooPriceProvider yahoo;
    private final RestClient http = Http.client();

    public UsStockPriceProvider(YahooPriceProvider yahoo) {
        this.yahoo = yahoo;
    }

    @Override
    public AssetClass assetClass() {
        return AssetClass.US_STOCK;
    }

    @Override
    public Optional<Quote> quote(String symbol) {
        Optional<JsonNode> chart = yahoo.chart(symbol, "5d");
        TreeMap<LocalDate, BigDecimal> fx = byDate(fxHistory("5d"));
        if (chart.isEmpty() || fx.isEmpty()) return Optional.empty();
        JsonNode meta = chart.get().path("meta");
        BigDecimal usd = YahooPriceProvider.dec(meta.path("regularMarketPrice"));
        if (usd == null) return Optional.empty();
        List<PricePoint> closes = YahooPriceProvider.closes(chart.get());
        BigDecimal rateNow = yahoo.chart(FX, "1d").map(r -> YahooPriceProvider.dec(r.path("meta").path("regularMarketPrice"))).orElse(fx.lastEntry().getValue());
        BigDecimal prevInr = null;
        if (closes.size() >= 2) {
            PricePoint p = closes.get(closes.size() - 2);
            var rate = fx.floorEntry(p.date());
            prevInr = inr(p.close(), rate == null ? rateNow : rate.getValue());
        }
        long t = meta.path("regularMarketTime").asLong(0);
        return Optional.of(new Quote(inr(usd, rateNow), prevInr, t > 0 ? Instant.ofEpochSecond(t) : Instant.now(),
                "Yahoo Finance (USD × USD/INR)", "USD", usd));
    }

    @Override
    public List<PricePoint> history(String symbol) {
        List<PricePoint> usd = yahoo.chart(symbol, "2y").map(YahooPriceProvider::closes).orElse(List.of());
        TreeMap<LocalDate, BigDecimal> fx = byDate(fxHistory("2y"));
        if (usd.isEmpty() || fx.isEmpty()) return List.of();
        List<PricePoint> out = new ArrayList<>();
        for (PricePoint p : usd) {
            var rate = fx.floorEntry(p.date());
            if (rate == null) rate = fx.firstEntry();
            out.add(new PricePoint(p.date(), inr(p.close(), rate.getValue())));
        }
        return out;
    }

    /** USD/INR closes, oldest first. */
    public List<PricePoint> fxHistory(String range) {
        return yahoo.chart(FX, range).map(YahooPriceProvider::closes).orElse(List.of());
    }

    @Override
    public List<SymbolMatch> search(String query) {
        try {
            JsonNode body = http.get().uri(SEARCH, query).retrieve().body(JsonNode.class);
            List<SymbolMatch> out = new ArrayList<>();
            for (JsonNode q : body.path("quotes")) {
                String exchange = US_EXCHANGES.get(q.path("exchange").asText());
                if (exchange == null || !TYPES.contains(q.path("quoteType").asText())) continue;
                String name = q.hasNonNull("longname") ? q.path("longname").asText() : q.path("shortname").asText();
                out.add(new SymbolMatch(q.path("symbol").asText(), name, exchange, "US_STOCK"));
            }
            return out;
        } catch (Exception e) {
            log.warn("Yahoo US search failed for '{}': {}", query, e.getMessage());
            return List.of();
        }
    }

    static TreeMap<LocalDate, BigDecimal> byDate(List<PricePoint> points) {
        TreeMap<LocalDate, BigDecimal> m = new TreeMap<>();
        points.forEach(p -> m.put(p.date(), p.close()));
        return m;
    }

    private static BigDecimal inr(BigDecimal usd, BigDecimal rate) {
        return usd.multiply(rate).setScale(4, RoundingMode.HALF_UP);
    }
}
