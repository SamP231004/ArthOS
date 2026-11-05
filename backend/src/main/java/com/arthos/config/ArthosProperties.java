package com.arthos.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Arrays;
import java.util.List;

@ConfigurationProperties(prefix = "arthos")
public record ArthosProperties(Jwt jwt, Cors cors, Google google) {

    public record Jwt(String secret, long expiryHours) {}

    public record Google(String clientId, String extraClientIds) {
        public boolean enabled() {
            return clientId != null && !clientId.isBlank();
        }

        /** Every client ID whose tokens we accept (web first). */
        public List<String> audiences() {
            if (!enabled()) return List.of();
            var out = new java.util.ArrayList<String>(List.of(clientId.trim()));
            if (extraClientIds != null) Arrays.stream(extraClientIds.split(",")).map(String::trim).filter(s -> !s.isEmpty()).forEach(out::add);
            return List.copyOf(out);
        }
    }

    public record Cors(String allowedOrigins) {
        public List<String> originList() {
            if (allowedOrigins == null || allowedOrigins.isBlank()) return List.of();
            return Arrays.stream(allowedOrigins.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }
    }
}
