package com.arthos.market;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/** NSE/BSE regular session: Monday–Friday, 09:15–15:30 IST. Exchange holidays aren't modelled (prices just won't move). */
public final class MarketHours {

    public static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final LocalTime OPEN = LocalTime.of(9, 15);
    private static final LocalTime CLOSE = LocalTime.of(15, 30);

    private MarketHours() {}

    public static boolean isOpen(Instant at) {
        ZonedDateTime t = at.atZone(IST);
        if (t.getDayOfWeek() == DayOfWeek.SATURDAY || t.getDayOfWeek() == DayOfWeek.SUNDAY) return false;
        LocalTime time = t.toLocalTime();
        return !time.isBefore(OPEN) && time.isBefore(CLOSE);
    }

    public static boolean isOpenNow() {
        return isOpen(Instant.now());
    }

    public static final ZoneId NEW_YORK = ZoneId.of("America/New_York");

    /** NYSE/NASDAQ regular session: Monday–Friday, 09:30–16:00 New York time (DST handled by the zone). */
    public static boolean isUsOpen(Instant at) {
        ZonedDateTime t = at.atZone(NEW_YORK);
        if (t.getDayOfWeek() == DayOfWeek.SATURDAY || t.getDayOfWeek() == DayOfWeek.SUNDAY) return false;
        LocalTime time = t.toLocalTime();
        return !time.isBefore(LocalTime.of(9, 30)) && time.isBefore(LocalTime.of(16, 0));
    }

    public static boolean isUsOpenNow() {
        return isUsOpen(Instant.now());
    }
}
