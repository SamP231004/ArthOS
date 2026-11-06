package com.arthos.automation;

import com.arthos.expense.ExpenseCategory;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** A category the user taught ArthOS for a merchant (learned from what they save; their corrections win). */
@Document("merchant_rules")
@CompoundIndex(name = "user_key", def = "{'userId': 1, 'key': 1}", unique = true)
public class MerchantRule {

    @Id
    private String id;
    private String userId;
    /** {@link MerchantKey} of the merchant. */
    private String key;
    private ExpenseCategory category;
    /** How many saved expenses have confirmed this mapping. */
    private int uses;
    private Instant updatedAt;
    /** Set for demo accounts so their rules expire with the sandbox. */
    @Indexed(expireAfter = "0s")
    private Instant expiresAt;

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public ExpenseCategory getCategory() { return category; }
    public void setCategory(ExpenseCategory category) { this.category = category; }
    public int getUses() { return uses; }
    public void setUses(int uses) { this.uses = uses; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}
