package com.arthos.expense;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ExpenseRepository extends MongoRepository<Expense, String> {

    List<Expense> findByUserIdAndMonthKeyOrderByDateDescCreatedAtDesc(String userId, String monthKey);

    Optional<Expense> findByIdAndUserId(String id, String userId);
}
