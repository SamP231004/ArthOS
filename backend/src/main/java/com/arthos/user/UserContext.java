package com.arthos.user;

import com.arthos.common.MonthKey;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;

/** Per-user facts that controllers need: the timezone for "today"/"this month", and demo expiry. */
@Component
public class UserContext {

    private final UserRepository users;

    public UserContext(UserRepository users) {
        this.users = users;
    }

    public ZoneId zone(String userId) {
        return MonthKey.zoneOrDefault(users.findById(userId).map(User::getTimezone).orElse(null));
    }

    /** For demo accounts, when their data self-destructs; null for real accounts. */
    public Instant demoExpiry(String userId) {
        return users.findById(userId).filter(User::isDemo).map(User::getExpiresAt).orElse(null);
    }
}
