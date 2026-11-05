package com.arthos.user;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.math.BigDecimal;
import java.time.Instant;

@Document("users")
public class User {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true)
    private String email;

    /** Null for accounts created with Google that never set a password. */
    private String passwordHash;

    /** Google account subject ("sub"), set when the user signs in with Google. */
    @Indexed(unique = true, sparse = true)
    private String googleId;

    private String avatarUrl;

    private String currency = "INR";

    private String timezone = "Asia/Kolkata";

    /** Planned monthly earning target (blueprint 7.2). */
    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal monthlyIncomeTarget;

    /** Pay-yourself-first rule; null fields mean the default (20% of income). */
    private SavingsRule.Mode savingsMode;
    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal savingsValue;

    private boolean onboardingCompleted;

    /** Sandbox account created from "Try the demo". */
    private boolean demo;

    /** Set only for demo data: MongoDB's TTL monitor deletes the document after this instant. */
    @Indexed(expireAfter = "0s")
    private Instant expiresAt;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getGoogleId() { return googleId; }
    public void setGoogleId(String googleId) { this.googleId = googleId; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public BigDecimal getMonthlyIncomeTarget() { return monthlyIncomeTarget; }
    public void setMonthlyIncomeTarget(BigDecimal monthlyIncomeTarget) { this.monthlyIncomeTarget = monthlyIncomeTarget; }
    public SavingsRule savingsRule() { return SavingsRule.of(savingsMode, savingsValue); }
    public SavingsRule.Mode getSavingsMode() { return savingsMode; }
    public void setSavingsMode(SavingsRule.Mode savingsMode) { this.savingsMode = savingsMode; }
    public BigDecimal getSavingsValue() { return savingsValue; }
    public void setSavingsValue(BigDecimal savingsValue) { this.savingsValue = savingsValue; }
    public boolean isOnboardingCompleted() { return onboardingCompleted; }
    public void setOnboardingCompleted(boolean onboardingCompleted) { this.onboardingCompleted = onboardingCompleted; }
    public boolean isDemo() { return demo; }
    public void setDemo(boolean demo) { this.demo = demo; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
