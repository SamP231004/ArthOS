package com.arthos.auth;

import com.arthos.auth.AuthDtos.AuthResponse;
import com.arthos.auth.AuthDtos.GoogleLoginRequest;
import com.arthos.auth.AuthDtos.ProvidersResponse;
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
    private final GoogleTokenVerifier google;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt, DemoService demo, DemoRateLimiter demoLimiter,
                          GoogleTokenVerifier google) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.demo = demo;
        this.demoLimiter = demoLimiter;
        this.google = google;
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
                .filter(found -> found.getPasswordHash() != null && encoder.matches(req.password(), found.getPasswordHash()))
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        return respond(u);
    }

    @GetMapping("/providers")
    ProvidersResponse providers() {
        return new ProvidersResponse(google.webClientId().map(ProvidersResponse.GoogleProvider::new).orElse(null));
    }

    /**
     * Sign in with Google. Finds the account by Google ID, else links an existing account with the same verified
     * email, else creates a new account (which then goes through onboarding).
     */
    @PostMapping("/google")
    AuthResponse google(@Valid @RequestBody GoogleLoginRequest req) {
        if (!google.enabled()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Google sign-in isn't configured yet");
        GoogleTokenVerifier.GoogleIdentity id = google.verify(req.credential())
                .orElseThrow(() -> ApiException.unauthorized("Google sign-in failed. Please try again."));
        if (id.email() == null || !id.emailVerified()) throw ApiException.unauthorized("Your Google email address isn't verified");

        String email = normalize(id.email());
        User u = users.findByGoogleId(id.subject())
                .or(() -> users.findByEmail(email).filter(existing -> !existing.isDemo()))
                .orElseGet(User::new);
        boolean isNew = u.getId() == null;
        if (isNew) {
            u.setEmail(email);
            u.setName(id.name() != null && !id.name().isBlank() ? id.name().trim() : email.substring(0, email.indexOf('@')));
        }
        u.setGoogleId(id.subject());
        if (id.picture() != null) u.setAvatarUrl(id.picture());
        try {
            u = users.save(u);
        } catch (DuplicateKeyException e) {
            // two first-time sign-ins racing: the other request created the account
            u = users.findByGoogleId(id.subject()).orElseThrow(() -> ApiException.conflict("Please try signing in again"));
        }
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
