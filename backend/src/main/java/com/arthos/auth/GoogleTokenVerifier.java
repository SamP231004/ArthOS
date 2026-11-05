package com.arthos.auth;

import com.arthos.config.ArthosProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Verifies Google ID tokens ("Sign in with Google" credentials): signature against Google's published keys,
 * expiry, issuer, and that the audience is one of our OAuth client IDs.
 */
@Component
public class GoogleTokenVerifier {

    public record GoogleIdentity(String subject, String email, boolean emailVerified, String name, String picture) {}

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);
    private static final String JWKS = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

    private final List<String> audiences;
    private final JwtDecoder decoder;

    public GoogleTokenVerifier(ArthosProperties props) {
        this.audiences = props.google() == null ? List.of() : props.google().audiences();
        if (audiences.isEmpty()) {
            this.decoder = null;
            return;
        }
        NimbusJwtDecoder d = NimbusJwtDecoder.withJwkSetUri(JWKS).build();
        d.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                jwt -> ISSUERS.contains(String.valueOf(jwt.getClaims().get("iss")))
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Unexpected issuer", null)),
                jwt -> jwt.getAudience() != null && jwt.getAudience().stream().anyMatch(audiences::contains)
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Unexpected audience", null))));
        this.decoder = d;
    }

    public boolean enabled() {
        return decoder != null;
    }

    /** The web client ID, exposed to the website so it can render the Google button. */
    public Optional<String> webClientId() {
        return audiences.isEmpty() ? Optional.empty() : Optional.of(audiences.getFirst());
    }

    public Optional<GoogleIdentity> verify(String idToken) {
        if (decoder == null || idToken == null || idToken.isBlank()) return Optional.empty();
        try {
            Jwt jwt = decoder.decode(idToken);
            Object verified = jwt.getClaims().get("email_verified");
            return Optional.of(new GoogleIdentity(
                    jwt.getSubject(),
                    jwt.getClaimAsString("email"),
                    Boolean.TRUE.equals(verified) || "true".equals(String.valueOf(verified)),
                    jwt.getClaimAsString("name"),
                    jwt.getClaimAsString("picture")));
        } catch (JwtException e) {
            log.info("Rejected Google ID token: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
