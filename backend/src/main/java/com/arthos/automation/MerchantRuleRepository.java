package com.arthos.automation;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface MerchantRuleRepository extends MongoRepository<MerchantRule, String> {

    Optional<MerchantRule> findByUserIdAndKey(String userId, String key);
}
