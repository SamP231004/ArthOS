package com.arthos;

import com.arthos.config.ArthosProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(ArthosProperties.class)
public class ArthosApplication {

    public static void main(String[] args) {
        SpringApplication.run(ArthosApplication.class, args);
    }
}
