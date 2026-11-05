package com.arthos.market;

import com.arthos.common.ApiException;
import com.arthos.market.MarketTypes.Quote;
import com.arthos.market.MarketTypes.SymbolMatch;
import com.arthos.portfolio.Holding.AssetClass;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Symbol search and price preview for the "add investment" flow. */
@RestController
@RequestMapping("/api/market")
public class MarketController {

    private final MarketDataService market;

    public MarketController(MarketDataService market) {
        this.market = market;
    }

    @GetMapping("/search")
    List<SymbolMatch> search(@RequestParam AssetClass assetClass, @RequestParam String q) {
        if (q.trim().length() < 2) return List.of();
        return market.search(assetClass, q);
    }

    @GetMapping("/quote")
    Quote quote(@RequestParam AssetClass assetClass, @RequestParam(required = false) String symbol) {
        String key = switch (assetClass) {
            case GOLD -> "GOLD:XAU";
            case BOND -> throw ApiException.badRequest("Bonds don't have live prices — enter the price you paid");
            default -> {
                if (symbol == null || symbol.isBlank()) throw ApiException.badRequest("symbol is required");
                yield assetClass + ":" + symbol.trim().toUpperCase(java.util.Locale.ROOT);
            }
        };
        return market.quote(key).orElseThrow(() -> ApiException.notFound("Price"));
    }
}
