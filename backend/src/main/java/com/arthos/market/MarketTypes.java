package com.arthos.market;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Value types shared by the market-data layer. Prices are in INR per unit (gold: per gram of 24K). */
public final class MarketTypes {

    private MarketTypes() {}

    public record Quote(BigDecimal price, BigDecimal previousClose, Instant asOf, String source) {}

    public record PricePoint(LocalDate date, BigDecimal close) {}

    public record SymbolMatch(String symbol, String name, String exchange, String assetClass) {}
}
