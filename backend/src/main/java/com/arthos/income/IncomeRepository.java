package com.arthos.income;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface IncomeRepository extends MongoRepository<Income, String> {

    List<Income> findByUserIdAndMonthKeyOrderByDateDescCreatedAtDesc(String userId, String monthKey);

    List<Income> findByUserId(String userId);

    Optional<Income> findByIdAndUserId(String id, String userId);
}
