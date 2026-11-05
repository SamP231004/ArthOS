package com.arthos.demo;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window limit on demo creation per client IP, so the public endpoint can't be used to flood
 * the database. Per-instance only, which is fine for a single backend instance.
 */
@Component
public class DemoRateLimiter {

    static final int MAX_PER_WINDOW = 10;
    static final Duration WINDOW = Duration.ofHours(1);

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final Clock clock;

    public DemoRateLimiter() {
        this(Clock.systemUTC());
    }

    DemoRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public boolean tryAcquire(String key) {
        long now = clock.millis();
        long cutoff = now - WINDOW.toMillis();
        if (hits.size() > 10_000) hits.values().removeIf(q -> q.isEmpty() || q.peekLast() < cutoff); // bound memory
        Deque<Long> q = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && q.peekFirst() < cutoff) q.pollFirst();
            if (q.size() >= MAX_PER_WINDOW) return false;
            q.addLast(now);
            return true;
        }
    }
}
