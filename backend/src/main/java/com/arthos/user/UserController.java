package com.arthos.user;

import com.arthos.auth.CurrentUser;
import com.arthos.common.ApiException;
import com.arthos.user.UserDtos.UpdateProfileRequest;
import com.arthos.user.UserDtos.UserResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneId;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping("/me")
    UserResponse me() {
        return UserResponse.from(load());
    }

    @PatchMapping("/me")
    UserResponse update(@Valid @RequestBody UpdateProfileRequest req) {
        User u = load();
        if (req.name() != null) u.setName(req.name().trim());
        if (req.currency() != null) u.setCurrency(req.currency());
        if (req.timezone() != null) {
            try {
                ZoneId.of(req.timezone());
            } catch (Exception e) {
                throw ApiException.badRequest("Unknown timezone: " + req.timezone());
            }
            u.setTimezone(req.timezone());
        }
        if (req.monthlyIncomeTarget() != null) u.setMonthlyIncomeTarget(req.monthlyIncomeTarget());
        if (req.onboardingCompleted() != null) u.setOnboardingCompleted(req.onboardingCompleted());
        return UserResponse.from(users.save(u));
    }

    private User load() {
        return users.findById(CurrentUser.id()).orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
    }
}
