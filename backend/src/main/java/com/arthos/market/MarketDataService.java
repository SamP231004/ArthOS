package com.arthos.market;

import com.arthos.market.MarketTypes.PricePoint;
import com.arthos.market.MarketTypes.Quote;
import com.arthos.market.MarketTypes.SymbolMatch;
import com.arthos.portfolio.Holding.AssetClass;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/**
 * The portfolio engine's only view of market data. Routes "CLASS:SYMBOL" keys to the right {@link PriceProvider},
 * caches results (memory + Mongo), refreshes in parallel, and serves the last good value if a source is down.
 */
@Service
public class MarketDataService {

    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);
    private static final Duration QUOTE_TTL = Duration.ofMinutes(10);
    private static final Duration NAV_TTL = Duration.ofHours(3);
    private static final Duration HISTORY_TTL = Duration.ofHours(12);
    private static final long WAIT_SECONDS = 12;

    private final Map<AssetClass, PriceProvider> providers = new EnumMap<>(AssetClass.class);
    private final MarketCacheRepository store;
    private final Map<String, MarketCacheEntry> memory = new ConcurrentHashMap<>();
    private final ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();

    public MarketDataService(List<PriceProvider> all, MarketCacheRepository store) {
        all.forEach(p -> providers.put(p.assetClass(), p));
        this.store = store;
    }

    public List<SymbolMatch> search(AssetClass cls, String query) {
        PriceProvider p = providers.get(cls);
        return p == null || query == null || query.isBlank() ? List.of() : p.search(query.trim());
    }

    public Optional<Quote> quote(String key) {
        return Optional.ofNullable(quotes(List.of(key)).get(key));
    }

    /** Quotes for many keys, refreshed in parallel where stale. Missing keys had no data at all. */
    public Map<String, Quote> quotes(Collection<String> keys) {
        Map<String, Future<Quote>> pending = new HashMap<>();
        for (String k : keys.stream().distinct().toList()) pending.put(k, pool.submit(() -> loadQuote(k)));
        Map<String, Quote> out = new HashMap<>();
        pending.forEach((k, f) -> {
            Quote q = await(f, k);
            if (q != null) out.put(k, q);
        });
        return out;
    }

    public Map<String, List<PricePoint>> histories(Collection<String> keys) {
        Map<String, Future<List<PricePoint>>> pending = new HashMap<>();
        for (String k : keys.stream().distinct().toList()) pending.put(k, pool.submit(() -> loadHistory(k)));
        Map<String, List<PricePoint>> out = new HashMap<>();
        pending.forEach((k, f) -> {
            List<PricePoint> h = await(f, k);
            out.put(k, h == null ? List.of() : h);
        });
        return out;
    }

    private Quote loadQuote(String key) {
        MarketCacheEntry e = entry(key);
        Duration ttl = key.startsWith("MUTUAL_FUND:") ? NAV_TTL : QUOTE_TTL;
        if (e.getPrice() == null || stale(e.getQuoteFetchedAt(), ttl)) {
            Optional<Quote> fresh = provider(key).flatMap(p -> p.quote(symbol(key)));
            if (fresh.isPresent()) {
                Quote q = fresh.get();
                e.setPrice(q.price());
                e.setPreviousClose(q.previousClose());
                e.setAsOf(q.asOf());
                e.setSource(q.source());
                e.setQuoteFetchedAt(Instant.now());
                save(e);
            }
        }
        return e.getPrice() == null ? null : new Quote(e.getPrice(), e.getPreviousClose(), e.getAsOf(), e.getSource());
    }

    private List<PricePoint> loadHistory(String key) {
        MarketCacheEntry e = entry(key);
        if (e.getHistory() == null || e.getHistory().isEmpty() || stale(e.getHistoryFetchedAt(), HISTORY_TTL)) {
            List<PricePoint> fresh = provider(key).map(p -> p.history(symbol(key))).orElse(List.of());
            if (!fresh.isEmpty()) {
                e.setHistory(fresh);
                e.setHistoryFetchedAt(Instant.now());
                save(e);
            }
        }
        return e.getHistory() == null ? List.of() : e.getHistory();
    }

    /**
     * The cached entry for a key, loading it from Mongo on first use. The database read happens outside the map's
     * lock on purpose: {@code computeIfAbsent} holds a {@code synchronized} lock while it runs, and a virtual thread
     * blocking on I/O inside one pins its carrier thread. With every carrier pinned, all other virtual threads stalled
     * until their 12 s timeouts (seen when the startup price warm-up overlapped a request).
     */
    private MarketCacheEntry entry(String key) {
        MarketCacheEntry cached = memory.get(key);
        if (cached != null) return cached;
        MarketCacheEntry loaded;
        try {
            loaded = store.findById(key).orElseGet(() -> new MarketCacheEntry(key));
        } catch (Exception ex) {
            loaded = new MarketCacheEntry(key);
        }
        MarketCacheEntry raced = memory.putIfAbsent(key, loaded);
        return raced != null ? raced : loaded;
    }

    private void save(MarketCacheEntry e) {
        try {
            store.save(e);
        } catch (Exception ex) {
            log.warn("Could not persist market cache {}: {}", e.getKey(), ex.getMessage());
        }
    }

    private Optional<PriceProvider> provider(String key) {
        try {
            return Optional.ofNullable(providers.get(AssetClass.valueOf(key.substring(0, key.indexOf(':')))));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private static String symbol(String key) {
        return key.substring(key.indexOf(':') + 1);
    }

    private static boolean stale(Instant fetchedAt, Duration ttl) {
        return fetchedAt == null || fetchedAt.plus(ttl).isBefore(Instant.now());
    }

    private static <T> T await(Future<T> f, String key) {
        try {
            return f.get(WAIT_SECONDS, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Market data for {} unavailable: {}", key, e.getMessage());
            return null;
        }
    }
}
