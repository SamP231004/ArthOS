package com.arthos.common;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Supplier;

/**
 * Runs independent database reads at the same time on virtual threads. The database is a network hop away (and on
 * the hosted setup, in another region), so a page that needs five queries waits for one round trip instead of five.
 * Callers must capture request-scoped values (like {@code CurrentUser.id()}) before forking.
 */
public final class Parallel {

    private static final ExecutorService POOL = Executors.newVirtualThreadPerTaskExecutor();

    private Parallel() {}

    public static <T> CompletableFuture<T> async(Supplier<T> task) {
        return CompletableFuture.supplyAsync(task, POOL);
    }

    public static CompletableFuture<Void> async(Runnable task) {
        return CompletableFuture.runAsync(task, POOL);
    }

    /** The result, rethrowing the task's own exception (so ApiExceptions keep their status). */
    public static <T> T get(CompletableFuture<T> f) {
        try {
            return f.join();
        } catch (CompletionException e) {
            if (e.getCause() instanceof RuntimeException r) throw r;
            if (e.getCause() instanceof Error err) throw err;
            throw e;
        }
    }
}
