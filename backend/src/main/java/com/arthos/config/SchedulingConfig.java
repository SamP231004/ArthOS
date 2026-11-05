package com.arthos.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Background jobs (price refresh). Disabled in tests via arthos.scheduling.enabled=false. */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "arthos.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class SchedulingConfig {}
