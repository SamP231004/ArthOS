package com.arthos.budget;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface BudgetRepository extends MongoRepository<Budget, String> {

    Optional<Budget> findByUserIdAndMonthKey(String userId, String monthKey);

    /** Most recent budget before a month ("YYYY-MM" sorts lexicographically). */
    Optional<Budget> findFirstByUserIdAndMonthKeyLessThanOrderByMonthKeyDesc(String userId, String monthKey);

    void deleteByUserIdAndMonthKey(String userId, String monthKey);
}
