package com.arthos.auth;

import com.arthos.config.ArthosProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private static final String ISSUER = "arthos";

    private final SecretKey key;
    private final Duration ttl;

    public JwtService(ArthosProperties props) {
        String secret = props.jwt().secret() == null ? "" : props.jwt().secret().trim();
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 characters (got " + bytes.length
                    + "). Unset it to use the dev default, or generate one with: openssl rand -base64 48");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.ttl = Duration.ofHours(props.jwt().expiryHours());
    }

    public String issue(String userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(ISSUER)
                .subject(userId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    public Instant expiryFromNow() {
        return Instant.now().plus(ttl);
    }

    /** Returns the user id if the token is valid. */
    public Optional<String> verify(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(ISSUER)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.ofNullable(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
