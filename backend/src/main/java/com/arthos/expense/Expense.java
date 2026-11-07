package com.arthos.expense;

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
import java.time.LocalDate;

@Document("expenses")
@CompoundIndex(name = "user_month_date", def = "{'userId': 1, 'monthKey': 1, 'date': -1}")
public class Expense {

    @Id
    private String id;
    private String userId;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal amount;

    private ExpenseCategory category;
    private String merchant;
    private PaymentSource paymentSource;
    private LocalDate date;
    /** "YYYY-MM", derived from {@link #date}. */
    private String monthKey;
    private String note;
    private boolean recurring;

    /** Set only for demo data: MongoDB's TTL monitor deletes the document after this instant. */
    @Indexed(expireAfter = "0s")
    private Instant expiresAt;

    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public ExpenseCategory getCategory() { return category; }
    public void setCategory(ExpenseCategory category) { this.category = category; }
    public String getMerchant() { return merchant; }
    public void setMerchant(String merchant) { this.merchant = merchant; }
    public PaymentSource getPaymentSource() { return paymentSource; }
    public void setPaymentSource(PaymentSource paymentSource) { this.paymentSource = paymentSource; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getMonthKey() { return monthKey; }
    public void setMonthKey(String monthKey) { this.monthKey = monthKey; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public boolean isRecurring() { return recurring; }
    public void setRecurring(boolean recurring) { this.recurring = recurring; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
