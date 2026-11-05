package com.arthos.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    Map<String, Object> health() {
        return Map.of("status", "ok", "service", "arthos-backend", "time", Instant.now().toString());
    }
}
