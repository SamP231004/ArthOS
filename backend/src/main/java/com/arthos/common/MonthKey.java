package com.arthos.common;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;

/** Month-based grouping helper. Records are stored with a "YYYY-MM" key for fast monthly queries. */
public final class MonthKey {

    private MonthKey() {}

    public static String of(LocalDate date) {
        return YearMonth.from(date).toString();
    }

    /** Parses "YYYY-MM"; falls back to the current month in the given zone when blank. */
    public static YearMonth parseOrCurrent(String value, ZoneId zone) {
        if (value == null || value.isBlank()) return YearMonth.now(zone);
        try {
            return YearMonth.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("month must be in YYYY-MM format");
        }
    }

    public static ZoneId zoneOrDefault(String tz) {
        try {
            return tz == null || tz.isBlank() ? ZoneId.of("Asia/Kolkata") : ZoneId.of(tz);
        } catch (Exception e) {
            return ZoneId.of("Asia/Kolkata");
        }
    }
}
