package com.arthos.market;

import com.arthos.market.MarketTypes.PricePoint;
import com.arthos.market.MarketTypes.Quote;
import com.arthos.market.MarketTypes.SymbolMatch;
import com.arthos.portfolio.Holding.AssetClass;

import java.util.List;
import java.util.Optional;

/**
 * A source of prices for one asset class. Implementations are swappable (blueprint §9.2: free sources during the MVP
 * must be replaceable without rewriting the portfolio engine); the engine only sees {@link MarketDataService}.
 */
public interface PriceProvider {

    AssetClass assetClass();

    Optional<Quote> quote(String symbol);

    /** Daily closes, oldest first, covering at least the last two years where available. */
    List<PricePoint> history(String symbol);

    default List<SymbolMatch> search(String query) {
        return List.of();
    }
}
