package com.arthos.market;

import com.arthos.market.MarketTypes.PricePoint;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Persisted price cache shared by all users (survives restarts, so a cold start doesn't hammer the sources). */
@Document("market_cache")
public class MarketCacheEntry {

    @Id
    private String key;
    private BigDecimal price;
    private BigDecimal previousClose;
    private Instant asOf;
    private String source;
    private Instant quoteFetchedAt;
    private List<PricePoint> history;
    private Instant historyFetchedAt;

    public MarketCacheEntry() {}

    public MarketCacheEntry(String key) {
        this.key = key;
    }

    public String getKey() { return key; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getPreviousClose() { return previousClose; }
    public void setPreviousClose(BigDecimal previousClose) { this.previousClose = previousClose; }
    public Instant getAsOf() { return asOf; }
    public void setAsOf(Instant asOf) { this.asOf = asOf; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public Instant getQuoteFetchedAt() { return quoteFetchedAt; }
    public void setQuoteFetchedAt(Instant quoteFetchedAt) { this.quoteFetchedAt = quoteFetchedAt; }
    public List<PricePoint> getHistory() { return history; }
    public void setHistory(List<PricePoint> history) { this.history = history; }
    public Instant getHistoryFetchedAt() { return historyFetchedAt; }
    public void setHistoryFetchedAt(Instant historyFetchedAt) { this.historyFetchedAt = historyFetchedAt; }
}
