package com.arthos.user;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * "Pay yourself first": savings are set aside the moment income arrives, and only what is left is spendable.
 * Either a share of every income ({@link Mode#PERCENT}) or a fixed amount each month ({@link Mode#FIXED}, capped at
 * the income actually received, since money that hasn't arrived can't be saved).
 */
public record SavingsRule(Mode mode, BigDecimal value) {

    public enum Mode { PERCENT, FIXED }

    public static final SavingsRule DEFAULT = new SavingsRule(Mode.PERCENT, BigDecimal.valueOf(20));

    public static SavingsRule of(Mode mode, BigDecimal value) {
        if (mode == null || value == null) return DEFAULT;
        return new SavingsRule(mode, value);
    }

    /** The amount to set aside out of {@code income} received so far. */
    public BigDecimal setAside(BigDecimal income) {
        if (income == null || income.signum() <= 0 || value.signum() <= 0) return BigDecimal.ZERO.setScale(2);
        BigDecimal v = mode == Mode.PERCENT
                ? income.multiply(value.min(BigDecimal.valueOf(100))).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                : value.min(income);
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
