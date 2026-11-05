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
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * NSE/BSE stocks and ETFs via Yahoo Finance's public chart and search endpoints (free, no key). Unofficial: fine for
 * the MVP, replaceable via {@link PriceProvider} for a licensed feed in production.
 */
@Component
public class YahooPriceProvider implements PriceProvider {

    private static final Logger log = LoggerFactory.getLogger(YahooPriceProvider.class);
    private static final String CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{s}?range={r}&interval=1d";
    private static final String SEARCH = "https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=12&newsCount=0";
    private static final Set<String> INDIAN_EXCHANGES = Set.of("NSI", "BSE");
    private static final Set<String> TYPES = Set.of("EQUITY", "ETF");

    private final RestClient http = Http.client();

    @Override
    public AssetClass assetClass() {
        return AssetClass.STOCK;
    }

    @Override
    public Optional<Quote> quote(String symbol) {
        return chart(symbol, "5d").map(r -> {
            JsonNode meta = r.path("meta");
            BigDecimal price = dec(meta.path("regularMarketPrice"));
            // previous session's close: the last close before the latest bar
            List<PricePoint> closes = closes(r);
            BigDecimal prev = closes.size() >= 2 ? closes.get(closes.size() - 2).close() : dec(meta.path("chartPreviousClose"));
            long t = meta.path("regularMarketTime").asLong(0);
            return price == null ? null : new Quote(price, prev, t > 0 ? Instant.ofEpochSecond(t) : Instant.now(), "Yahoo Finance");
        });
    }

    @Override
    public List<PricePoint> history(String symbol) {
        return chart(symbol, "2y").map(YahooPriceProvider::closes).orElse(List.of());
    }

    @Override
    public List<SymbolMatch> search(String query) {
        try {
            JsonNode body = http.get().uri(SEARCH, query).retrieve().body(JsonNode.class);
            List<SymbolMatch> out = new ArrayList<>();
            for (JsonNode q : body.path("quotes")) {
                if (!INDIAN_EXCHANGES.contains(q.path("exchange").asText()) || !TYPES.contains(q.path("quoteType").asText())) continue;
                String name = q.hasNonNull("longname") ? q.path("longname").asText() : q.path("shortname").asText();
                out.add(new SymbolMatch(q.path("symbol").asText(), name, q.path("exchange").asText().equals("NSI") ? "NSE" : "BSE", "STOCK"));
            }
            return out;
        } catch (Exception e) {
            log.warn("Yahoo search failed for '{}': {}", query, e.getMessage());
            return List.of();
        }
    }

    /** Raw chart result, shared with the gold provider. */
    Optional<JsonNode> chart(String symbol, String range) {
        try {
            JsonNode body = http.get().uri(CHART, symbol, range).retrieve().body(JsonNode.class);
            JsonNode r = body == null ? null : body.path("chart").path("result").path(0);
            return r == null || r.isMissingNode() ? Optional.empty() : Optional.of(r);
        } catch (Exception e) {
            log.warn("Yahoo chart failed for {}: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    static List<PricePoint> closes(JsonNode r) {
        ZoneId zone;
        try {
            zone = ZoneId.of(r.path("meta").path("exchangeTimezoneName").asText("Asia/Kolkata"));
        } catch (Exception e) {
            zone = ZoneId.of("Asia/Kolkata");
        }
        JsonNode ts = r.path("timestamp");
        JsonNode cl = r.path("indicators").path("quote").path(0).path("close");
        List<PricePoint> out = new ArrayList<>();
        LocalDate last = null;
        for (int i = 0; i < ts.size(); i++) {
            BigDecimal c = dec(cl.path(i));
            if (c == null) continue;
            LocalDate d = Instant.ofEpochSecond(ts.path(i).asLong()).atZone(zone).toLocalDate();
            if (d.equals(last)) out.set(out.size() - 1, new PricePoint(d, c));
            else out.add(new PricePoint(d, c));
            last = d;
        }
        return out;
    }

    static BigDecimal dec(JsonNode n) {
        if (n == null || n.isMissingNode() || n.isNull() || !n.isNumber()) return null;
        return BigDecimal.valueOf(n.asDouble()).setScale(4, RoundingMode.HALF_UP);
    }
}
