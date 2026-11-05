package com.arthos.demo;

import com.arthos.market.MarketTypes.PricePoint;
import com.arthos.portfolio.Holding;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Test-only bridge to the package-private demo portfolio builder. */
public final class DemoPortfolioAccess {

    private DemoPortfolioAccess() {}

    public static List<Holding> build(String userId, LocalDate today, Instant expiresAt, Map<String, List<PricePoint>> histories) {
        return DemoPortfolio.build(userId, today, expiresAt, histories);
    }

    public static List<String> marketKeys() {
        return DemoPortfolio.marketKeys();
    }
}
