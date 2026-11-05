package com.arthos.income;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class IncomeDtos {

    private IncomeDtos() {}

    public record IncomeRequest(
            @NotNull @DecimalMin(value = "0.01", message = "must be greater than 0") @Digits(integer = 13, fraction = 2) BigDecimal amount,
            @NotBlank @Size(max = 120) String source,
            @NotNull IncomeType type,
            @NotNull LocalDate date,
            @Size(max = 500) String note,
            boolean recurring) {}

    public record IncomeResponse(
            String id, BigDecimal amount, String source, IncomeType type, LocalDate date,
            String monthKey, String note, boolean recurring, Instant createdAt, Instant updatedAt) {

        public static IncomeResponse from(Income i) {
            return new IncomeResponse(i.getId(), i.getAmount(), i.getSource(), i.getType(), i.getDate(),
                    i.getMonthKey(), i.getNote(), i.isRecurring(), i.getCreatedAt(), i.getUpdatedAt());
        }
    }
}
