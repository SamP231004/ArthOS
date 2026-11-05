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
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Indian mutual-fund NAVs (official AMFI data) via mfapi.in. Symbols are AMFI scheme codes. NAVs update daily. */
@Component
public class MfApiPriceProvider implements PriceProvider {

    private static final Logger log = LoggerFactory.getLogger(MfApiPriceProvider.class);
    private static final String SCHEME = "https://api.mfapi.in/mf/{code}";
    private static final String SEARCH = "https://api.mfapi.in/mf/search?q={q}";
    private static final DateTimeFormatter DMY = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private final RestClient http = Http.client();

    @Override
    public AssetClass assetClass() {
        return AssetClass.MUTUAL_FUND;
    }

    @Override
    public Optional<Quote> quote(String code) {
        List<PricePoint> h = history(code);
        if (h.isEmpty()) return Optional.empty();
        PricePoint last = h.getLast();
        BigDecimal prev = h.size() >= 2 ? h.get(h.size() - 2).close() : null;
        return Optional.of(new Quote(last.close(), prev, last.date().atTime(21, 0).atZone(ZoneId.of("Asia/Kolkata")).toInstant(), "AMFI via mfapi.in"));
    }

    @Override
    public List<PricePoint> history(String code) {
        try {
            JsonNode body = http.get().uri(SCHEME, code).retrieve().body(JsonNode.class);
            List<PricePoint> out = new ArrayList<>();
            for (JsonNode row : body.path("data")) {
                try {
                    out.add(new PricePoint(LocalDate.parse(row.path("date").asText(), DMY), new BigDecimal(row.path("nav").asText())));
                } catch (Exception ignored) {
                    // skip malformed rows
                }
            }
            out.sort((a, b) -> a.date().compareTo(b.date()));
            LocalDate cutoff = LocalDate.now().minusYears(3);
            return out.stream().filter(p -> !p.date().isBefore(cutoff)).toList();
        } catch (Exception e) {
            log.warn("mfapi history failed for {}: {}", code, e.getMessage());
            return List.of();
        }
    }

    @Override
    public List<SymbolMatch> search(String query) {
        try {
            JsonNode body = http.get().uri(SEARCH, query).retrieve().body(JsonNode.class);
            List<SymbolMatch> out = new ArrayList<>();
            for (JsonNode m : body) {
                out.add(new SymbolMatch(m.path("schemeCode").asText(), m.path("schemeName").asText(), "AMFI", "MUTUAL_FUND"));
                if (out.size() >= 15) break;
            }
            // Direct-growth plans first: they're what most self-directed investors hold.
            out.sort((a, b) -> Integer.compare(rank(a.name()), rank(b.name())));
            return out;
        } catch (Exception e) {
            log.warn("mfapi search failed for '{}': {}", query, e.getMessage());
            return List.of();
        }
    }

    private static int rank(String name) {
        String n = name.toLowerCase();
        int r = 0;
        if (!n.contains("direct")) r += 2;
        if (!n.contains("growth")) r += 1;
        if (n.contains("idcw") || n.contains("dividend")) r += 2;
        return r;
    }
}
