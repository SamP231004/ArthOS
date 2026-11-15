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
}
