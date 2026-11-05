package com.arthos.market;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/** Shared HTTP client for market data: short timeouts so one slow source never stalls a page load. */
final class Http {

    private Http() {}

    static RestClient client() {
        HttpClient jdk = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NORMAL).build();
        JdkClientHttpRequestFactory f = new JdkClientHttpRequestFactory(jdk);
        f.setReadTimeout(Duration.ofSeconds(8));
        return RestClient.builder()
                .requestFactory(f)
                .defaultHeader("User-Agent", "Mozilla/5.0 (compatible; ArthOS/0.1)")
                .defaultHeader("Accept", "application/json")
                .build();
    }
}
