package com.arthos.market;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Public reference data for importing broker files on the user's device: ISIN → NSE symbol (stocks and ETFs, from
 * NSE's published lists) and ISIN → AMFI scheme code (mutual funds, from AMFI's daily NAV file). Clients download this
 * index and match their file locally, so nothing from the user's file is sent anywhere before they confirm the import.
 * Cached for a day; the last good copy is served if a source is down.
 */
@Service
public class ReferenceIndex {

    private static final Logger log = LoggerFactory.getLogger(ReferenceIndex.class);
    private static final Duration TTL = Duration.ofHours(24);
    private static final String UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
    private static final String NSE_EQUITY = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv";
    private static final String NSE_ETF = "https://nsearchives.nseindia.com/content/equities/eq_etfseclist.csv";
    private static final String AMFI_NAV = "https://portal.amfiindia.com/spages/NAVAll.txt";
    /** Fallback when AMFI is unreachable (or its newer Sectigo root isn't in the JVM's trust store): fewer ISINs, same codes. */
    private static final String MFAPI_LIST = "https://api.mfapi.in/mf";

    /** eq: [isin, symbol, name] · mf: [isin, schemeCode, name] */
    public record Index(Instant generatedAt, List<String[]> eq, List<String[]> mf) {}

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NORMAL).build();
    private volatile Index cached;

    /** Build the index in the background soon after startup (and twice a day), so no import waits on the sources. */
    @org.springframework.scheduling.annotation.Scheduled(initialDelayString = "PT20S", fixedDelayString = "PT12H")
    void warm() {
        try {
            get();
        } catch (Exception e) {
            log.warn("Reference index warm-up failed: {}", e.getMessage());
        }
    }

    public Index get() {
        Index c = cached;
        if (c != null && c.generatedAt().plus(TTL).isAfter(Instant.now())) return c;
        synchronized (this) {
            c = cached;
            if (c != null && c.generatedAt().plus(TTL).isAfter(Instant.now())) return c;
            List<String[]> eq = new ArrayList<>(), mf = new ArrayList<>();
            try {
                eq.addAll(parseEquity(fetch(NSE_EQUITY)));
                eq.addAll(parseEtf(fetch(NSE_ETF)));
            } catch (Exception e) {
                log.warn("NSE reference list unavailable: {}", e.getMessage());
            }
            try {
                mf.addAll(parseAmfi(fetch(AMFI_NAV)));
            } catch (Exception e) {
                log.warn("AMFI reference list unavailable, falling back to mfapi.in: {}", e.getMessage());
                try {
                    mf.addAll(parseMfapi(fetch(MFAPI_LIST)));
                } catch (Exception e2) {
                    log.warn("mfapi.in scheme list unavailable: {}", e2.getMessage());
                }
            }
            if (eq.isEmpty() && mf.isEmpty() && c != null) return c; // keep the last good copy
            if (c != null) {
                if (eq.isEmpty()) eq = c.eq();
                if (mf.isEmpty()) mf = c.mf();
            }
            cached = new Index(Instant.now(), eq, mf);
            return cached;
        }
    }

    private String fetch(String url) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(30)).header("User-Agent", UA).header("Accept", "*/*").GET().build();
        HttpResponse<byte[]> res = http.send(req, HttpResponse.BodyHandlers.ofByteArray());
        if (res.statusCode() != 200) throw new IllegalStateException("HTTP " + res.statusCode() + " for " + url);
        return new String(res.body(), StandardCharsets.UTF_8);
    }

    // ---- parsers (package-private for tests)

    /** SYMBOL,NAME OF COMPANY, SERIES, DATE OF LISTING, PAID UP VALUE, MARKET LOT, ISIN NUMBER, FACE VALUE */
    static List<String[]> parseEquity(String csv) {
        List<String[]> out = new ArrayList<>();
        String[] lines = csv.split("\\r?\\n");
        for (int i = 1; i < lines.length; i++) {
            String[] f = splitCsv(lines[i]);
            if (f.length < 7) continue;
            String isin = f[6].trim(), symbol = f[0].trim();
            if (isin.length() == 12 && !symbol.isEmpty()) out.add(new String[] {isin, symbol, f[1].trim()});
        }
        return out;
    }

    /** Symbol,Underlying Asset,SecurityName,DateofListing,MarketLot,ISINNumber,FaceValue,... */
    static List<String[]> parseEtf(String csv) {
        List<String[]> out = new ArrayList<>();
        String[] lines = csv.split("\\r?\\n");
        for (int i = 1; i < lines.length; i++) {
            String[] f = splitCsv(lines[i]);
            if (f.length < 6) continue;
            String isin = f[5].trim(), symbol = f[0].trim();
            // NSE's SecurityName is a code ("NIPINDETFNIFTYBEES"): name ETFs by symbol + what they track
            String name = f[1].isBlank() ? symbol : symbol + " · " + f[1].trim() + " ETF";
            if (isin.length() == 12 && !symbol.isEmpty()) out.add(new String[] {isin, symbol, name});
        }
        return out;
    }

    /** Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;[Plan;Option;]Net Asset Value;Date */
    static List<String[]> parseAmfi(String text) {
        Map<String, String[]> byIsin = new LinkedHashMap<>();
        for (String line : text.split("\\r?\\n")) {
            String[] f = line.split(";", -1);
            if (f.length < 5 || !f[0].trim().matches("\\d+")) continue;
            String code = f[0].trim(), name = f[3].trim();
            for (String isin : new String[] {f[1].trim(), f[2].trim()}) {
                if (isin.length() == 12 && isin.startsWith("IN")) byIsin.putIfAbsent(isin, new String[] {isin, code, name});
            }
        }
        return new ArrayList<>(byIsin.values());
    }

    /** [{"schemeCode":122639,"schemeName":"…","isinGrowth":"INF879O01027","isinDivReinvestment":null}, …] */
    static List<String[]> parseMfapi(String json) throws Exception {
        Map<String, String[]> byIsin = new LinkedHashMap<>();
        for (com.fasterxml.jackson.databind.JsonNode n : new com.fasterxml.jackson.databind.ObjectMapper().readTree(json)) {
            String code = n.path("schemeCode").asText(""), name = n.path("schemeName").asText("");
            for (String f : new String[] {"isinGrowth", "isinDivReinvestment"}) {
                String isin = n.path(f).asText("");
                if (isin.length() == 12 && isin.startsWith("IN") && !code.isEmpty()) byIsin.putIfAbsent(isin, new String[] {isin, code, name});
            }
        }
        return new ArrayList<>(byIsin.values());
    }

    /** Minimal CSV split that honours double-quoted fields. */
    static String[] splitCsv(String line) {
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean q = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') q = !q;
            else if (ch == ',' && !q) {
                out.add(cur.toString());
                cur.setLength(0);
            } else cur.append(ch);
        }
        out.add(cur.toString());
        return out.toArray(new String[0]);
    }
}
