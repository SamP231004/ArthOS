package com.arthos.user;

import com.arthos.auth.CurrentUser;
import com.arthos.common.ApiException;
import com.arthos.user.UserDtos.UpdateProfileRequest;
import com.arthos.user.UserDtos.UserResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneId;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;
    private final org.springframework.data.mongodb.core.MongoTemplate mongo;

    public UserController(UserRepository users, org.springframework.data.mongodb.core.MongoTemplate mongo) {
        this.users = users;
        this.mongo = mongo;
    }

    @GetMapping("/me")
    UserResponse me() {
        return UserResponse.from(load());
    }

    /**
     * Delete the account and everything in it: incomes, expenses, budgets, investments and learned category rules.
     * Irreversible (Google Play requires in-app account deletion). The client signs out afterwards.
     */
    @DeleteMapping("/me")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void deleteAccount() {
        User u = load();
        org.springframework.data.mongodb.core.query.Query mine =
                org.springframework.data.mongodb.core.query.Query.query(org.springframework.data.mongodb.core.query.Criteria.where("userId").is(u.getId()));
        for (Class<?> c : new Class<?>[] {com.arthos.income.Income.class, com.arthos.expense.Expense.class, com.arthos.budget.Budget.class,
                com.arthos.portfolio.Holding.class, com.arthos.automation.MerchantRule.class}) {
            mongo.remove(mine, c);
        }
        users.delete(u);
    }

    @PatchMapping("/me")
    UserResponse update(@Valid @RequestBody UpdateProfileRequest req) {
        User u = load();
        if (req.name() != null) u.setName(req.name().trim());
        if (req.currency() != null) u.setCurrency(req.currency());
        if (req.timezone() != null) {
            try {
                ZoneId.of(req.timezone());
            } catch (Exception e) {
                throw ApiException.badRequest("Unknown timezone: " + req.timezone());
            }
            u.setTimezone(req.timezone());
        }
        if (req.monthlyIncomeTarget() != null) u.setMonthlyIncomeTarget(req.monthlyIncomeTarget());
        if (req.savingsMode() != null || req.savingsValue() != null) {
            SavingsRule.Mode mode = req.savingsMode() != null ? req.savingsMode() : u.savingsRule().mode();
            java.math.BigDecimal value = req.savingsValue() != null ? req.savingsValue() : u.savingsRule().value();
            if (mode == SavingsRule.Mode.PERCENT && value.compareTo(java.math.BigDecimal.valueOf(100)) > 0)
                throw ApiException.badRequest("Savings percentage can't be more than 100");
            u.setSavingsMode(mode);
            u.setSavingsValue(value);
        }
        if (req.savingsStartingBalance() != null) u.setSavingsStartingBalance(req.savingsStartingBalance());
        if (req.onboardingCompleted() != null) u.setOnboardingCompleted(req.onboardingCompleted());
        return UserResponse.from(users.save(u));
    }

    private User load() {
        return users.findById(CurrentUser.id()).orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
    }
}
