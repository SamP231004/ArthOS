package com.arthos;

import com.arthos.auth.AuthController;
import com.arthos.auth.GoogleTokenVerifier;
import com.arthos.auth.GoogleTokenVerifier.GoogleIdentity;
import com.arthos.auth.JwtService;
import com.arthos.config.SecurityConfig;
import com.arthos.demo.DemoRateLimiter;
import com.arthos.demo.DemoService;
import com.arthos.expense.ExpenseController;
import com.arthos.expense.ExpenseRepository;
import com.arthos.user.User;
import com.arthos.user.UserController;
import com.arthos.user.UserRepository;
import com.arthos.user.UserContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {AuthController.class, UserController.class, ExpenseController.class})
@Import({SecurityConfig.class, JwtService.class, UserContext.class, DemoRateLimiter.class})
class ApiWebLayerTest {

    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired PasswordEncoder encoder;

    @MockitoBean UserRepository users;
    @MockitoBean ExpenseRepository expenses;
    @MockitoBean MongoTemplate mongo;
    @MockitoBean DemoService demoService;
    @MockitoBean GoogleTokenVerifier google;

    @Test
    void registerIssuesTokenAndNormalizesEmail() throws Exception {
        when(users.existsByEmail("asha@example.com")).thenReturn(false);
        when(users.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("u1");
            return u;
        });

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Asha\",\"email\":\" Asha@Example.com \",\"password\":\"secret123\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("asha@example.com"))
                .andExpect(jsonPath("$.user.currency").value("INR"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());
    }

    @Test
    void loginRejectsWrongPassword() throws Exception {
        User u = user();
        u.setPasswordHash(encoder.encode("correct-password"));
        when(users.findByEmail("asha@example.com")).thenReturn(Optional.of(u));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"asha@example.com\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void protectedEndpointsRequireValidToken() throws Exception {
        mvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401));
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer not-a-jwt")).andExpect(status().isUnauthorized());

        when(users.findById("u1")).thenReturn(Optional.of(user()));
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + jwt.issue("u1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Asha"));
    }

    @Test
    void expenseValidationReturnsFieldErrors() throws Exception {
        mvc.perform(post("/api/expenses").header("Authorization", "Bearer " + jwt.issue("u1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":-5,\"category\":\"FOOD\",\"paymentSource\":\"UPI\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.amount").exists())
                .andExpect(jsonPath("$.fieldErrors.date").exists());
    }

    @Test
    void corsPreflightAllowsConfiguredOrigin() throws Exception {
        mvc.perform(options("/api/summary").header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }

    @Test
    void demoEndpointIssuesSandboxSessionAndIsRateLimited() throws Exception {
        User demo = user();
        demo.setDemo(true);
        demo.setOnboardingCompleted(true);
        demo.setExpiresAt(java.time.Instant.now().plus(DemoService.TTL));
        when(demoService.createDemoUser()).thenReturn(demo);

        mvc.perform(post("/api/auth/demo").with(r -> { r.setRemoteAddr("203.0.113.7"); return r; }))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.demo").value(true))
                .andExpect(jsonPath("$.user.onboardingCompleted").value(true));

        for (int i = 1; i < 10; i++) mvc.perform(post("/api/auth/demo").with(r -> { r.setRemoteAddr("203.0.113.7"); return r; }));
        mvc.perform(post("/api/auth/demo").with(r -> { r.setRemoteAddr("203.0.113.7"); return r; }))
                .andExpect(status().isTooManyRequests());
        mvc.perform(post("/api/auth/demo").with(r -> { r.setRemoteAddr("198.51.100.1"); return r; }))
                .andExpect(status().isCreated());
    }

    @Test
    void googleSignInCreatesThenLinksAccounts() throws Exception {
        when(google.enabled()).thenReturn(true);
        when(google.verify("tok-new")).thenReturn(Optional.of(new GoogleIdentity("g-1", "New.Person@Gmail.com", true, "New Person", "https://pic")));
        when(users.findByGoogleId("g-1")).thenReturn(Optional.empty());
        when(users.findByEmail("new.person@gmail.com")).thenReturn(Optional.empty());
        when(users.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) u.setId("u-new");
            return u;
        });
        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"tok-new\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("new.person@gmail.com"))
                .andExpect(jsonPath("$.user.name").value("New Person"))
                .andExpect(jsonPath("$.user.avatarUrl").value("https://pic"))
                .andExpect(jsonPath("$.user.onboardingCompleted").value(false));

        // existing password account with the same verified email gets linked, keeping its profile
        User existing = user();
        existing.setOnboardingCompleted(true);
        when(google.verify("tok-link")).thenReturn(Optional.of(new GoogleIdentity("g-2", "asha@example.com", true, "Asha G", null)));
        when(users.findByGoogleId("g-2")).thenReturn(Optional.empty());
        when(users.findByEmail("asha@example.com")).thenReturn(Optional.of(existing));
        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"tok-link\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value("u1"))
                .andExpect(jsonPath("$.user.name").value("Asha"))
                .andExpect(jsonPath("$.user.onboardingCompleted").value(true));
        org.junit.jupiter.api.Assertions.assertEquals("g-2", existing.getGoogleId());
    }

    @Test
    void googleSignInRejectsBadOrUnverifiedTokens() throws Exception {
        when(google.enabled()).thenReturn(true);
        when(google.verify("bad")).thenReturn(Optional.empty());
        when(google.verify("unverified")).thenReturn(Optional.of(new GoogleIdentity("g-3", "x@y.com", false, "X", null)));
        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"bad\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"unverified\"}"))
                .andExpect(status().isUnauthorized());

        when(google.enabled()).thenReturn(false);
        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"bad\"}"))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void googleAccessTokenFlowUsesTokenVerification() throws Exception {
        when(google.enabled()).thenReturn(true);
        when(google.verifyAccessToken("ya29.ok")).thenReturn(Optional.of(new GoogleIdentity("g-9", "pop@up.com", true, "Pop Up", null)));
        when(users.findByGoogleId("g-9")).thenReturn(Optional.empty());
        when(users.findByEmail("pop@up.com")).thenReturn(Optional.empty());
        when(users.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) u.setId("u-pop");
            return u;
        });
        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{\"accessToken\":\"ya29.ok\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("pop@up.com"));
        when(google.verifyAccessToken("ya29.foreign")).thenReturn(Optional.empty());
        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{\"accessToken\":\"ya29.foreign\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void providersExposeGoogleClientIdOnlyWhenConfigured() throws Exception {
        when(google.webClientId()).thenReturn(Optional.empty());
        mvc.perform(get("/api/auth/providers")).andExpect(status().isOk()).andExpect(jsonPath("$.google").doesNotExist());
        when(google.webClientId()).thenReturn(Optional.of("123.apps.googleusercontent.com"));
        mvc.perform(get("/api/auth/providers")).andExpect(jsonPath("$.google.clientId").value("123.apps.googleusercontent.com"));
    }

    @Test
    void passwordLoginRefusesGoogleOnlyAccounts() throws Exception {
        User g = user();
        g.setPasswordHash(null);
        when(users.findByEmail("asha@example.com")).thenReturn(Optional.of(g));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"asha@example.com\",\"password\":\"whatever123\"}"))
                .andExpect(status().isUnauthorized());
    }

    private static User user() {
        User u = new User();
        u.setId("u1");
        u.setName("Asha");
        u.setEmail("asha@example.com");
        return u;
    }
}
