package com.arthos.market;

import com.arthos.portfolio.Holding;
import com.arthos.portfolio.HoldingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

/**
 * Background refresh (blueprint §13 "scheduled calculations and periodic refresh"): keeps quotes for every held
 * symbol warm so portfolio pages load from cache. Pages still refresh stale quotes on demand if this hasn't run.
 */
@Component
public class PriceRefreshJob {

    private static final Logger log = LoggerFactory.getLogger(PriceRefreshJob.class);

    private final MongoTemplate mongo;
    private final MarketDataService market;

    public PriceRefreshJob(MongoTemplate mongo, MarketDataService market) {
        this.mongo = mongo;
        this.market = market;
    }

    @Scheduled(initialDelayString = "PT2M", fixedDelayString = "PT15M")
    void refresh() {
        try {
            Query q = new Query();
            q.fields().include("assetClass").include("symbol");
            List<String> keys = mongo.find(q, Holding.class).stream().map(Holding::marketKey).filter(Objects::nonNull).distinct().toList();
            if (keys.isEmpty()) return;
            market.quotes(keys);
            log.info("Refreshed quotes for {} symbols", keys.size());
        } catch (Exception e) {
            log.warn("Price refresh failed: {}", e.getMessage());
        }
    }
}
