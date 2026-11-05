package com.arthos.user;

import com.arthos.common.MonthKey;
import org.springframework.stereotype.Component;

import java.time.ZoneId;

/** Resolves the timezone used to decide "today" and "this month" for a user. */
@Component
public class UserZones {

    private final UserRepository users;

    public UserZones(UserRepository users) {
        this.users = users;
    }

    public ZoneId of(String userId) {
        return MonthKey.zoneOrDefault(users.findById(userId).map(User::getTimezone).orElse(null));
    }
}
