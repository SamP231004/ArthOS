package com.arthos.auth;

import com.arthos.auth.AuthDtos.AuthResponse;
import com.arthos.auth.AuthDtos.LoginRequest;
import com.arthos.auth.AuthDtos.RegisterRequest;
import com.arthos.common.ApiException;
import com.arthos.demo.DemoRateLimiter;
import com.arthos.demo.DemoService;
import com.arthos.user.User;
import com.arthos.user.UserDtos.UserResponse;
import com.arthos.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final DemoService demo;
    private final DemoRateLimiter demoLimiter;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt, DemoService demo, DemoRateLimiter demoLimiter) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.demo = demo;
        this.demoLimiter = demoLimiter;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        String email = normalize(req.email());
        if (users.existsByEmail(email)) throw ApiException.conflict("An account with this email already exists");

        User u = new User();
        u.setName(req.name().trim());
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(req.password()));
        try {
            u = users.save(u);
        } catch (DuplicateKeyException e) {
            throw ApiException.conflict("An account with this email already exists");
        }
        return respond(u);
    }

    @PostMapping("/login")
    AuthResponse login(@Valid @RequestBody LoginRequest req) {
        User u = users.findByEmail(normalize(req.email()))
                .filter(found -> encoder.matches(req.password(), found.getPasswordHash()))
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        return respond(u);
    }

    /** Starts a private, pre-filled sandbox session. The account and its data self-delete after 24 hours. */
    @PostMapping("/demo")
    @ResponseStatus(HttpStatus.CREATED)
    AuthResponse demo(HttpServletRequest request) {
        if (!demoLimiter.tryAcquire(request.getRemoteAddr())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many demo sessions from your network. Please try again later.");
        }
        User u = demo.createDemoUser();
        return new AuthResponse(jwt.issue(u.getId(), DemoService.TTL), u.getExpiresAt(), UserResponse.from(u));
    }

    private AuthResponse respond(User u) {
        return new AuthResponse(jwt.issue(u.getId()), jwt.expiryFromNow(), UserResponse.from(u));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
