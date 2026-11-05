package com.arthos.market;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface MarketCacheRepository extends MongoRepository<MarketCacheEntry, String> {}
