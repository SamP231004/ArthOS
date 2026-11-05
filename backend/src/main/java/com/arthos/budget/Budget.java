package com.arthos.budget;

import com.arthos.expense.ExpenseCategory;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A spending plan for one month. Months without their own budget inherit the most recent earlier one,
 * so users set it once and it carries forward.
 */
@Document("budgets")
@CompoundIndex(name = "user_month", def = "{'userId': 1, 'monthKey': 1}", unique = true)
public class Budget {

    @Id
    private String id;
    private String userId;
    /** "YYYY-MM". */
    private String monthKey;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal limit;

    private BudgetMode mode;

    /** Fixed costs (e.g. rent, EMIs) that don't count against the daily/weekly allowance. */
    private List<ExpenseCategory> excludedCategories = new ArrayList<>();

    /** Demo data only: removed by the Mongo TTL monitor. */
    @Indexed(expireAfter = "0s")
    private Instant expiresAt;

    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getMonthKey() { return monthKey; }
    public void setMonthKey(String monthKey) { this.monthKey = monthKey; }
    public BigDecimal getLimit() { return limit; }
    public void setLimit(BigDecimal limit) { this.limit = limit; }
    public BudgetMode getMode() { return mode; }
    public void setMode(BudgetMode mode) { this.mode = mode; }
    public List<ExpenseCategory> getExcludedCategories() { return excludedCategories; }
    public void setExcludedCategories(List<ExpenseCategory> excludedCategories) { this.excludedCategories = excludedCategories; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
