package com.arthos.auth;

import com.arthos.user.UserDtos.UserResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class AuthDtos {

    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Size(max = 80) String name,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 72, message = "must be 8-72 characters") String password) {

        public RegisterRequest {
            email = trim(email);
            name = trim(name);
        }
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {

        public LoginRequest {
            email = trim(email);
        }
    }

    private static String trim(String s) {
        return s == null ? null : s.trim();
    }

    public record AuthResponse(String token, Instant expiresAt, UserResponse user) {}

    /**
     * Either an ID token ("credential", from Google's own button / native SDKs) or an OAuth access token
     * (from the popup token flow behind our custom-styled web button).
     */
    public record GoogleLoginRequest(String credential, String accessToken) {}

    /** Which sign-in methods the clients should offer. */
    public record ProvidersResponse(GoogleProvider google) {
        public record GoogleProvider(String clientId) {}
    }
}
