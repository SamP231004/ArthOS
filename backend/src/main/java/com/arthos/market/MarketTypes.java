package com.arthos.market;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Value types shared by the market-data layer. Prices are in INR per unit (gold: per gram of 24K). */
public final class MarketTypes {

    private MarketTypes() {}

    /**
     * @param currency    the instrument's own currency ("INR", or "USD" for US stocks)
     * @param nativePrice the price in that currency (null when it is INR); {@code price} is always INR
     */
    public record Quote(BigDecimal price, BigDecimal previousClose, Instant asOf, String source, String currency, BigDecimal nativePrice) {
        public Quote(BigDecimal price, BigDecimal previousClose, Instant asOf, String source) {
            this(price, previousClose, asOf, source, "INR", null);
        }
    }

    public record PricePoint(LocalDate date, BigDecimal close) {}

    public record SymbolMatch(String symbol, String name, String exchange, String assetClass) {}
}
