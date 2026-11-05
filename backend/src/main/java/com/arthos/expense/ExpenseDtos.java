package com.arthos.expense;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class ExpenseDtos {

    private ExpenseDtos() {}

    public record ExpenseRequest(
            @NotNull @DecimalMin(value = "0.01", message = "must be greater than 0") @Digits(integer = 13, fraction = 2) BigDecimal amount,
            @NotNull ExpenseCategory category,
            @Size(max = 120) String merchant,
            @NotNull PaymentSource paymentSource,
            @NotNull LocalDate date,
            @Size(max = 500) String note,
            boolean recurring) {}

    public record ExpenseResponse(
            String id, BigDecimal amount, ExpenseCategory category, String merchant, PaymentSource paymentSource,
            LocalDate date, String monthKey, String note, boolean recurring, Instant createdAt, Instant updatedAt) {

        public static ExpenseResponse from(Expense e) {
            return new ExpenseResponse(e.getId(), e.getAmount(), e.getCategory(), e.getMerchant(), e.getPaymentSource(),
                    e.getDate(), e.getMonthKey(), e.getNote(), e.isRecurring(), e.getCreatedAt(), e.getUpdatedAt());
        }
    }
}
