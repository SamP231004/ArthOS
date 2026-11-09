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
    private final ReferenceIndex reference;

    public MarketController(MarketDataService market, ReferenceIndex reference) {
        this.market = market;
        this.reference = reference;
    }

    /**
     * Public ISIN reference data (NSE symbols, AMFI scheme codes) for importing broker files on the device: the client
     * matches its file against this locally, so no part of the file is sent before the user confirms the import.
     */
    @GetMapping("/isin-index")
    org.springframework.http.ResponseEntity<ReferenceIndex.Index> isinIndex() {
        return org.springframework.http.ResponseEntity.ok()
                .cacheControl(org.springframework.http.CacheControl.maxAge(java.time.Duration.ofHours(12)).cachePrivate())
                .body(reference.get());
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
