package com.arthos;

import com.arthos.auth.AuthController;
import com.arthos.auth.JwtService;
import com.arthos.config.SecurityConfig;
import com.arthos.expense.ExpenseController;
import com.arthos.expense.ExpenseRepository;
import com.arthos.user.User;
import com.arthos.user.UserController;
import com.arthos.user.UserRepository;
import com.arthos.user.UserZones;
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
@Import({SecurityConfig.class, JwtService.class, UserZones.class})
class ApiWebLayerTest {

    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired PasswordEncoder encoder;

    @MockitoBean UserRepository users;
    @MockitoBean ExpenseRepository expenses;
    @MockitoBean MongoTemplate mongo;

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

    private static User user() {
        User u = new User();
        u.setId("u1");
        u.setName("Asha");
        u.setEmail("asha@example.com");
        return u;
    }
}
