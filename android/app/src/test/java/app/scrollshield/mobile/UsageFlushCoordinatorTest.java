package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class UsageFlushCoordinatorTest {
    private static final long INTERVAL_MS = 10_000L;

    @Test
    public void intervalBlocksNormalFlushButForceBypassesIt() {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(5_000L);
        coordinator.addPendingUsage("2026-08-16_instagram", 1_000L);

        assertNull(coordinator.beginFlush(10_000L, false, INTERVAL_MS));
        UsageFlushCoordinator.FlushBatch forced = coordinator.beginFlush(10_000L, true, INTERVAL_MS);

        assertTrue(forced != null);
        assertEquals(1_000L, forced.increments.get("2026-08-16_instagram").longValue());
    }

    @Test
    public void onlyOneFlushCanBeInFlightAndNewUsageStaysPending() {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage("2026-08-16_instagram", 2_000L);
        UsageFlushCoordinator.FlushBatch first = coordinator.beginFlush(20_000L, false, INTERVAL_MS);
        assertTrue(first != null);

        coordinator.addPendingUsage("2026-08-16_instagram", 3_000L);
        assertNull(coordinator.beginFlush(30_000L, true, INTERVAL_MS));
        assertEquals(5_000L, coordinator.getUnpersistedUsageMs("2026-08-16_instagram"));
    }

    @Test
    public void successfulFlushDropsOnlyItsSnapshot() {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage("2026-08-16_instagram", 2_000L);
        UsageFlushCoordinator.FlushBatch first = coordinator.beginFlush(20_000L, false, INTERVAL_MS);
        assertTrue(first != null);

        coordinator.addPendingUsage("2026-08-16_instagram", 3_000L);
        assertTrue(coordinator.completeFlush(first.id, true, 21_000L));

        assertEquals(3_000L, coordinator.getUnpersistedUsageMs("2026-08-16_instagram"));
        assertEquals(21_000L, coordinator.getLastSuccessfulFlushMs());
        assertFalse(coordinator.hasActiveFlush());
        assertTrue(coordinator.hasPendingUsage());
    }

    @Test
    public void failedFlushMergesSnapshotBackWithUsageThatArrivedDuringWrite() {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage("2026-08-16_instagram", 2_000L);
        UsageFlushCoordinator.FlushBatch first = coordinator.beginFlush(20_000L, false, INTERVAL_MS);
        assertTrue(first != null);

        coordinator.addPendingUsage("2026-08-16_instagram", 3_000L);
        coordinator.addPendingUsage("2026-08-16_youtube", 4_000L);
        assertTrue(coordinator.completeFlush(first.id, false, 21_000L));

        assertEquals(5_000L, coordinator.getUnpersistedUsageMs("2026-08-16_instagram"));
        assertEquals(4_000L, coordinator.getUnpersistedUsageMs("2026-08-16_youtube"));
        assertEquals(0L, coordinator.getLastSuccessfulFlushMs());
    }

    @Test
    public void staleCompletionCannotAcknowledgeAnotherBatch() {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage("2026-08-16_instagram", 2_000L);
        UsageFlushCoordinator.FlushBatch first = coordinator.beginFlush(20_000L, false, INTERVAL_MS);
        assertTrue(first != null);

        assertFalse(coordinator.completeFlush(first.id + 1L, true, 21_000L));
        assertTrue(coordinator.hasActiveFlush());
        assertEquals(2_000L, coordinator.getUnpersistedUsageMs("2026-08-16_instagram"));
    }

    @Test
    public void dailyLimitViewIncludesPendingAndInFlightUsage() {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage("2026-08-16_instagram", 2_000L);
        UsageFlushCoordinator.FlushBatch first = coordinator.beginFlush(20_000L, false, INTERVAL_MS);
        assertTrue(first != null);

        coordinator.addPendingUsage("2026-08-16_instagram", 3_000L);
        assertEquals(5_000L, coordinator.getUnpersistedUsageMs("2026-08-16_instagram"));
    }

    @Test
    public void invalidDurationsAndKeysDoNotEnterAccounting() {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage("", 1_000L);
        coordinator.addPendingUsage(null, 1_000L);
        coordinator.addPendingUsage("2026-08-16_instagram", 0L);
        coordinator.addPendingUsage("2026-08-16_instagram", -1L);

        assertFalse(coordinator.hasPendingUsage());
        assertNull(coordinator.beginFlush(20_000L, true, INTERVAL_MS));
    }

    @Test
    public void accountingSaturatesInsteadOfOverflowingNegative() {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage("2026-08-16_instagram", Long.MAX_VALUE - 5L);
        coordinator.addPendingUsage("2026-08-16_instagram", 10L);

        assertEquals(Long.MAX_VALUE, coordinator.getUnpersistedUsageMs("2026-08-16_instagram"));
    }
}
