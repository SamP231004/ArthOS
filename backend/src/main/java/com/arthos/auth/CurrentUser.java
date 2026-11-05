package com.arthos.auth;

import com.arthos.common.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {

    private CurrentUser() {}

    /** Id of the authenticated user (set by {@link JwtAuthFilter}). */
    public static String id() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof String id)) {
            throw ApiException.unauthorized("Authentication required");
        }
        return id;
    }
}
