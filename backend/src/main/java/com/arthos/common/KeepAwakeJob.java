package com.arthos.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Keeps the free Render instance from sleeping. Render spins a free service down after ~15 minutes without inbound
 * traffic, and waking it takes 30–60 s: that made the demo and the first screen hang, and the app's Google sign-in
 * check time out. GitHub's scheduled workflow couldn't fix it (GitHub runs scheduled jobs hours apart), so the
 * service pings its own public URL every 10 minutes. The request goes out and back in through Render's proxy, so it
 * counts as traffic. Only active when RENDER_EXTERNAL_URL is set (Render sets it automatically); off locally.
 */
@Component
public class KeepAwakeJob {

    private static final Logger log = LoggerFactory.getLogger(KeepAwakeJob.class);

    private final String baseUrl;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public KeepAwakeJob(@Value("${RENDER_EXTERNAL_URL:}") String baseUrl) {
        this.baseUrl = baseUrl == null ? "" : baseUrl.replaceAll("/+$", "");
    }

    @Scheduled(initialDelayString = "PT1M", fixedDelayString = "PT10M")
    void ping() {
        if (baseUrl.isBlank()) return;
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + "/api/health")).timeout(Duration.ofSeconds(20)).GET().build();
            http.send(req, HttpResponse.BodyHandlers.discarding());
        } catch (Exception e) {
            log.debug("Keep-awake ping failed: {}", e.getMessage());
        }
    }
}
