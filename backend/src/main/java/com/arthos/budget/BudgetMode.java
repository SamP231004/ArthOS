package com.arthos.budget;

/** Blueprint §8.1. */
public enum BudgetMode {
    /** Monthly limit divided evenly across every day of the month. */
    FIXED_DAILY,
    /** Unspent or overspent money is spread across the remaining days of the month. */
    ADAPTIVE_DAILY,
    /** Monthly limit distributed per week (weeks run day 1–7, 8–14, …; the last week is shorter). */
    WEEKLY
}
