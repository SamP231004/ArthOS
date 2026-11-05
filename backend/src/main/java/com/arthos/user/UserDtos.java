package com.arthos.user;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

public final class UserDtos {

    private UserDtos() {}

    public record UserResponse(
            String id,
            String name,
            String email,
            String avatarUrl,
            String currency,
            String timezone,
            BigDecimal monthlyIncomeTarget,
            boolean onboardingCompleted,
            boolean demo,
            Instant expiresAt,
            Instant createdAt) {

        public static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getName(), u.getEmail(), u.getAvatarUrl(), u.getCurrency(), u.getTimezone(),
                    u.getMonthlyIncomeTarget(), u.isOnboardingCompleted(), u.isDemo(), u.getExpiresAt(), u.getCreatedAt());
        }
    }

    /** All fields optional: only non-null fields are applied. */
    public record UpdateProfileRequest(
            @Size(min = 1, max = 80) String name,
            @Pattern(regexp = "^[A-Z]{3}$", message = "must be a 3-letter ISO currency code") String currency,
            @Size(max = 64) String timezone,
            @DecimalMin(value = "0", message = "must be zero or more") BigDecimal monthlyIncomeTarget,
            Boolean onboardingCompleted) {}
}
