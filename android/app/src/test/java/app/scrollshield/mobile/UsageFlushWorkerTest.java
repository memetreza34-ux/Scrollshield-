package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.Test;

public class UsageFlushWorkerTest {
    private static final String BUCKET = "2026-08-16_instagram";

    @Test
    public void successfulBackgroundWriteCompletesMatchingBatch() throws Exception {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage(BUCKET, 2_000L);
        UsageFlushCoordinator.FlushBatch batch = coordinator.beginFlush(20_000L, true, 10_000L);
        assertTrue(batch != null);

        AtomicLong clock = new AtomicLong(21_000L);
        ExecutorService executor = Executors.newSingleThreadExecutor();
        UsageFlushWorker worker = new UsageFlushWorker(
            coordinator,
            ignored -> true,
            clock::get,
            executor
        );

        assertTrue(worker.submit(batch));
        worker.close();
        assertTrue(worker.awaitTermination(2_000L));

        assertFalse(coordinator.hasActiveFlush());
        assertEquals(0L, coordinator.getUnpersistedUsageMs(BUCKET));
        assertEquals(21_000L, coordinator.getLastSuccessfulFlushMs());
    }

    @Test
    public void commitFailureMergesBatchBackIntoPendingAccounting() throws Exception {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage(BUCKET, 2_000L);
        UsageFlushCoordinator.FlushBatch batch = coordinator.beginFlush(20_000L, true, 10_000L);
        assertTrue(batch != null);

        ExecutorService executor = Executors.newSingleThreadExecutor();
        UsageFlushWorker worker = new UsageFlushWorker(
            coordinator,
            ignored -> false,
            () -> 21_000L,
            executor
        );

        assertTrue(worker.submit(batch));
        worker.close();
        assertTrue(worker.awaitTermination(2_000L));

        assertFalse(coordinator.hasActiveFlush());
        assertEquals(2_000L, coordinator.getUnpersistedUsageMs(BUCKET));
        assertEquals(0L, coordinator.getLastSuccessfulFlushMs());
    }

    @Test
    public void writerExceptionAlsoMergesBatchBack() throws Exception {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage(BUCKET, 2_000L);
        UsageFlushCoordinator.FlushBatch batch = coordinator.beginFlush(20_000L, true, 10_000L);
        assertTrue(batch != null);

        ExecutorService executor = Executors.newSingleThreadExecutor();
        UsageFlushWorker worker = new UsageFlushWorker(
            coordinator,
            ignored -> {
                throw new IllegalStateException("disk failure");
            },
            () -> 21_000L,
            executor
        );

        assertTrue(worker.submit(batch));
        worker.close();
        assertTrue(worker.awaitTermination(2_000L));

        assertEquals(2_000L, coordinator.getUnpersistedUsageMs(BUCKET));
        assertFalse(coordinator.hasActiveFlush());
    }

    @Test
    public void newUsageRemainsCountedWhileWorkerIsBlocked() throws Exception {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage(BUCKET, 2_000L);
        UsageFlushCoordinator.FlushBatch batch = coordinator.beginFlush(20_000L, true, 10_000L);
        assertTrue(batch != null);

        CountDownLatch enteredWriter = new CountDownLatch(1);
        CountDownLatch releaseWriter = new CountDownLatch(1);
        ExecutorService executor = Executors.newSingleThreadExecutor();
        UsageFlushWorker worker = new UsageFlushWorker(
            coordinator,
            ignored -> {
                enteredWriter.countDown();
                try {
                    return releaseWriter.await(2, TimeUnit.SECONDS);
                } catch (InterruptedException error) {
                    Thread.currentThread().interrupt();
                    return false;
                }
            },
            () -> 21_000L,
            executor
        );

        assertTrue(worker.submit(batch));
        assertTrue(enteredWriter.await(2, TimeUnit.SECONDS));
        coordinator.addPendingUsage(BUCKET, 3_000L);
        assertEquals(5_000L, coordinator.getUnpersistedUsageMs(BUCKET));

        releaseWriter.countDown();
        worker.close();
        assertTrue(worker.awaitTermination(2_000L));
        assertEquals(3_000L, coordinator.getUnpersistedUsageMs(BUCKET));
    }

    @Test
    public void shutdownDrainPersistsUsageAddedWhileFirstBatchIsInFlight() throws Exception {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage(BUCKET, 2_000L);
        UsageFlushCoordinator.FlushBatch firstBatch = coordinator.beginFlush(20_000L, true, 10_000L);
        assertTrue(firstBatch != null);

        CountDownLatch enteredFirstWrite = new CountDownLatch(1);
        CountDownLatch releaseFirstWrite = new CountDownLatch(1);
        AtomicInteger writes = new AtomicInteger();
        AtomicLong persisted = new AtomicLong();
        AtomicLong clock = new AtomicLong(21_000L);
        ExecutorService executor = Executors.newSingleThreadExecutor();
        UsageFlushWorker worker = new UsageFlushWorker(
            coordinator,
            batch -> {
                int writeNumber = writes.incrementAndGet();
                if (writeNumber == 1) {
                    enteredFirstWrite.countDown();
                    try {
                        if (!releaseFirstWrite.await(2, TimeUnit.SECONDS)) return false;
                    } catch (InterruptedException error) {
                        Thread.currentThread().interrupt();
                        return false;
                    }
                }
                persisted.addAndGet(batch.increments.getOrDefault(BUCKET, 0L));
                clock.incrementAndGet();
                return true;
            },
            clock::get,
            executor
        );

        assertTrue(worker.submit(firstBatch));
        assertTrue(enteredFirstWrite.await(2, TimeUnit.SECONDS));
        coordinator.addPendingUsage(BUCKET, 3_000L);
        assertEquals(5_000L, coordinator.getUnpersistedUsageMs(BUCKET));

        assertTrue(worker.closeAfterDrainingPending());
        releaseFirstWrite.countDown();
        assertTrue(worker.awaitTermination(2_000L));

        assertEquals(2, writes.get());
        assertEquals(5_000L, persisted.get());
        assertEquals(0L, coordinator.getUnpersistedUsageMs(BUCKET));
        assertFalse(coordinator.hasActiveFlush());
    }

    @Test
    public void shutdownDrainRetriesOneFailedInFlightBatch() throws Exception {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage(BUCKET, 2_000L);
        UsageFlushCoordinator.FlushBatch batch = coordinator.beginFlush(20_000L, true, 10_000L);
        assertTrue(batch != null);

        AtomicInteger attempts = new AtomicInteger();
        ExecutorService executor = Executors.newSingleThreadExecutor();
        UsageFlushWorker worker = new UsageFlushWorker(
            coordinator,
            ignored -> attempts.incrementAndGet() > 1,
            () -> 21_000L,
            executor
        );

        assertTrue(worker.submit(batch));
        assertTrue(worker.closeAfterDrainingPending());
        assertTrue(worker.awaitTermination(2_000L));

        assertEquals(2, attempts.get());
        assertEquals(0L, coordinator.getUnpersistedUsageMs(BUCKET));
        assertFalse(coordinator.hasActiveFlush());
    }

    @Test
    public void closedWorkerRejectsBatchAndReturnsItToPending() throws Exception {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage(BUCKET, 2_000L);
        UsageFlushCoordinator.FlushBatch batch = coordinator.beginFlush(20_000L, true, 10_000L);
        assertTrue(batch != null);

        ExecutorService executor = Executors.newSingleThreadExecutor();
        UsageFlushWorker worker = new UsageFlushWorker(
            coordinator,
            ignored -> true,
            () -> 21_000L,
            executor
        );
        worker.close();
        assertTrue(worker.awaitTermination(2_000L));

        assertFalse(worker.submit(batch));
        assertEquals(2_000L, coordinator.getUnpersistedUsageMs(BUCKET));
        assertFalse(coordinator.hasActiveFlush());
    }
}
