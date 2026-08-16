package app.scrollshield.mobile;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Thread-safe state machine for moving usage increments from the service thread to a serialized
 * persistence worker without making daily-limit accounting lose sight of in-flight data.
 *
 * This class intentionally performs no Android or SharedPreferences I/O. The service owns the
 * worker/executor; this coordinator owns only the correctness boundary between pending, in-flight,
 * successful, and failed flushes.
 */
final class UsageFlushCoordinator {
    private final Map<String, Long> pendingUsageMs = new HashMap<>();
    private FlushBatch activeBatch;
    private long nextBatchId = 1L;
    private long lastSuccessfulFlushMs;

    UsageFlushCoordinator(long initialLastSuccessfulFlushMs) {
        lastSuccessfulFlushMs = Math.max(0L, initialLastSuccessfulFlushMs);
    }

    synchronized void addPendingUsage(String bucketKey, long durationMs) {
        if (bucketKey == null || bucketKey.trim().isEmpty() || durationMs <= 0L) return;
        pendingUsageMs.put(
            bucketKey,
            saturatingAdd(pendingUsageMs.getOrDefault(bucketKey, 0L), durationMs)
        );
    }

    /**
     * Starts at most one flush at a time. The returned snapshot is immutable and remains counted as
     * unpersisted usage until completeFlush(...) reports success.
     */
    synchronized FlushBatch beginFlush(long nowMs, boolean force, long flushIntervalMs) {
        if (activeBatch != null || pendingUsageMs.isEmpty()) return null;
        long normalizedNow = Math.max(0L, nowMs);
        long normalizedInterval = Math.max(0L, flushIntervalMs);
        if (!force && normalizedNow - lastSuccessfulFlushMs < normalizedInterval) return null;

        Map<String, Long> snapshot = new HashMap<>(pendingUsageMs);
        pendingUsageMs.clear();
        long batchId = nextBatchId++;
        if (nextBatchId <= 0L) nextBatchId = 1L;
        activeBatch = new FlushBatch(batchId, normalizedNow, snapshot);
        return activeBatch;
    }

    /**
     * Completes only the currently active batch. A stale callback cannot mutate accounting state.
     * Failed increments are merged back with usage that arrived while the write was in flight.
     */
    synchronized boolean completeFlush(long batchId, boolean success, long completionMs) {
        if (activeBatch == null || activeBatch.id != batchId) return false;

        FlushBatch completed = activeBatch;
        activeBatch = null;
        if (success) {
            lastSuccessfulFlushMs = Math.max(completed.startedAtMs, Math.max(0L, completionMs));
            return true;
        }

        for (Map.Entry<String, Long> entry : completed.increments.entrySet()) {
            pendingUsageMs.put(
                entry.getKey(),
                saturatingAdd(pendingUsageMs.getOrDefault(entry.getKey(), 0L), entry.getValue())
            );
        }
        return true;
    }

    synchronized long getUnpersistedUsageMs(String bucketKey) {
        if (bucketKey == null || bucketKey.isEmpty()) return 0L;
        long pending = pendingUsageMs.getOrDefault(bucketKey, 0L);
        long inFlight = activeBatch == null
            ? 0L
            : activeBatch.increments.getOrDefault(bucketKey, 0L);
        return saturatingAdd(pending, inFlight);
    }

    synchronized boolean hasActiveFlush() {
        return activeBatch != null;
    }

    synchronized boolean hasPendingUsage() {
        return !pendingUsageMs.isEmpty();
    }

    synchronized long getLastSuccessfulFlushMs() {
        return lastSuccessfulFlushMs;
    }

    private static long saturatingAdd(long current, long increment) {
        if (current <= 0L) current = 0L;
        if (increment <= 0L) return current;
        if (current > Long.MAX_VALUE - increment) return Long.MAX_VALUE;
        return current + increment;
    }

    static final class FlushBatch {
        final long id;
        final long startedAtMs;
        final Map<String, Long> increments;

        private FlushBatch(long id, long startedAtMs, Map<String, Long> increments) {
            this.id = id;
            this.startedAtMs = startedAtMs;
            this.increments = Collections.unmodifiableMap(new HashMap<>(increments));
        }
    }
}
