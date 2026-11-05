package com.arthos.portfolio;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface HoldingRepository extends MongoRepository<Holding, String> {

    List<Holding> findByUserIdOrderByCreatedAtAsc(String userId);

    Optional<Holding> findByIdAndUserId(String id, String userId);
}
