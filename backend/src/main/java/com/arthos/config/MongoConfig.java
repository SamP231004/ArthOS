package com.arthos.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

/** Kept off the main class so web-slice tests don't need a Mongo mapping context. */
@Configuration
@EnableMongoAuditing
public class MongoConfig {}
