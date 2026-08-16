package app.scrollshield.mobile;

import android.content.SharedPreferences;

import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Serialized background writer for UsageFlushCoordinator batches.
 *
 * The service decides when a flush may start. This worker only persists an already frozen batch and
 * reports the result back to the coordinator. Any rejection, exception, or commit failure is
 * reported as failure so the coordinator can merge the batch back into pending accounting.
 */
final class UsageFlushWorker implements AutoCloseable {
    interface BatchWriter {
        boolean write(UsageFlushCoordinator.FlushBatch batch);
    }

    interface Clock {
        long nowMs();
    }

    private final UsageFlushCoordinator coordinator;
    private final BatchWriter writer;
    private final Clock clock;
    private final ExecutorService executor;
    private final AtomicBoolean closed = new AtomicBoolean(false);

    static UsageFlushWorker forSharedPreferences(
        SharedPreferences preferences,
        String usageKeyPrefix,
        UsageFlushCoordinator coordinator
    ) {
        return new UsageFlushWorker(
            coordinator,
            batch -> persistBatch(preferences, usageKeyPrefix, batch),
            System::currentTimeMillis,
            Executors.newSingleThreadExecutor(runnable -> {
                Thread thread = new Thread(runnable, "scrollshield-usage-flush");
                thread.setDaemon(false);
                return thread;
            })
        );
    }

    UsageFlushWorker(
        UsageFlushCoordinator coordinator,
        BatchWriter writer,
        Clock clock,
        ExecutorService executor
    ) {
        if (coordinator == null || writer == null || clock == null || executor == null) {
            throw new IllegalArgumentException("Usage flush worker dependencies are required");
        }
        this.coordinator = coordinator;
        this.writer = writer;
        this.clock = clock;
        this.executor = executor;
    }

    boolean submit(UsageFlushCoordinator.FlushBatch batch) {
        if (batch == null) return false;
        if (closed.get()) {
            coordinator.completeFlush(batch.id, false, clock.nowMs());
            return false;
        }

        try {
            executor.execute(() -> persistAndComplete(batch));
            return true;
        } catch (RejectedExecutionException error) {
            coordinator.completeFlush(batch.id, false, clock.nowMs());
            return false;
        }
    }

    private void persistAndComplete(UsageFlushCoordinator.FlushBatch batch) {
        boolean success = false;
        try {
            success = writer.write(batch);
        } catch (RuntimeException error) {
            error.printStackTrace();
        } finally {
            coordinator.completeFlush(batch.id, success, clock.nowMs());
        }
    }

    @Override
    public void close() {
        if (closed.compareAndSet(false, true)) {
            executor.shutdown();
        }
    }

    boolean awaitTermination(long timeoutMs) throws InterruptedException {
        return executor.awaitTermination(Math.max(0L, timeoutMs), TimeUnit.MILLISECONDS);
    }

    boolean isClosed() {
        return closed.get();
    }

    private static boolean persistBatch(
        SharedPreferences preferences,
        String usageKeyPrefix,
        UsageFlushCoordinator.FlushBatch batch
    ) {
        if (preferences == null || usageKeyPrefix == null || usageKeyPrefix.isEmpty() || batch == null) {
            return false;
        }

        SharedPreferences.Editor editor = preferences.edit();
        for (Map.Entry<String, Long> entry : batch.increments.entrySet()) {
            long increment = entry.getValue() == null ? 0L : entry.getValue();
            if (increment <= 0L) continue;
            String key = usageKeyPrefix + entry.getKey();
            long existing = Math.max(0L, preferences.getLong(key, 0L));
            editor.putLong(key, saturatingAdd(existing, increment));
        }
        return editor.commit();
    }

    private static long saturatingAdd(long current, long increment) {
        if (current < 0L) current = 0L;
        if (increment <= 0L) return current;
        if (current > Long.MAX_VALUE - increment) return Long.MAX_VALUE;
        return current + increment;
    }
}
