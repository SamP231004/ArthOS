package com.arthos.market;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class MarketHoursTest {

    private static boolean at(String isoLocalIst) {
        return MarketHours.isOpen(LocalDateTime.parse(isoLocalIst).atZone(MarketHours.IST).toInstant());
    }

    @Test
    void regularSessionOnWeekdays() {
        assertThat(at("2026-11-16T09:14:59")).isFalse(); // Monday, before the open
        assertThat(at("2026-11-16T09:15:00")).isTrue();
        assertThat(at("2026-11-16T15:29:59")).isTrue();
        assertThat(at("2026-11-16T15:30:00")).isFalse();
    }

    @Test
    void closedAtWeekends() {
        assertThat(at("2026-11-14T11:00:00")).isFalse(); // Saturday
        assertThat(at("2026-11-15T11:00:00")).isFalse(); // Sunday
    }

    @Test
    void usSessionFollowsNewYorkTimeAcrossDaylightSaving() {
        // 18 Nov 2026 (no DST): 9:30–16:00 New York = 20:00–02:30 IST
        assertThat(MarketHours.isUsOpen(java.time.ZonedDateTime.of(2026, 11, 18, 9, 30, 0, 0, MarketHours.NEW_YORK).toInstant())).isTrue();
        assertThat(MarketHours.isUsOpen(java.time.ZonedDateTime.of(2026, 11, 18, 16, 0, 0, 0, MarketHours.NEW_YORK).toInstant())).isFalse();
        // 15 Jul 2026 (DST): still 9:30 local, one hour earlier in IST
        assertThat(MarketHours.isUsOpen(java.time.ZonedDateTime.of(2026, 7, 15, 10, 0, 0, 0, MarketHours.NEW_YORK).toInstant())).isTrue();
        assertThat(MarketHours.isUsOpen(java.time.ZonedDateTime.of(2026, 11, 21, 11, 0, 0, 0, MarketHours.NEW_YORK).toInstant())).isFalse(); // Saturday
    }
}
