package com.arthos.income;

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

@Document("incomes")
@CompoundIndex(name = "user_month_date", def = "{'userId': 1, 'monthKey': 1, 'date': -1}")
public class Income {

    @Id
    private String id;
    private String userId;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal amount;

    /** Who paid, e.g. employer or client name. */
    private String source;
    private IncomeType type;
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
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public IncomeType getType() { return type; }
    public void setType(IncomeType type) { this.type = type; }
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
