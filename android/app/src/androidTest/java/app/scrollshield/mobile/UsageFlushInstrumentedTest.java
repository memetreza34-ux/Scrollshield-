package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class UsageFlushInstrumentedTest {
    private static final String USAGE_KEY_PREFIX = "usage_ms_";
    private static final String BUCKET = "2026-08-16_instagram";

    private SharedPreferences preferences;

    @Before
    public void setUp() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        preferences = context.getSharedPreferences(
            ScrollShieldNativePlugin.PREFERENCES_NAME,
            Context.MODE_PRIVATE
        );
        preferences.edit().clear().commit();
    }

    @After
    public void tearDown() {
        preferences.edit().clear().commit();
    }

    @Test
    public void productionWorkerPersistsCoordinatorBatchIntoSharedPreferences() throws Exception {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage(BUCKET, 2_400L);
        UsageFlushCoordinator.FlushBatch batch = coordinator.beginFlush(20_000L, true, 10_000L);
        assertTrue(batch != null);

        UsageFlushWorker worker = UsageFlushWorker.forSharedPreferences(
            preferences,
            USAGE_KEY_PREFIX,
            coordinator
        );

        assertTrue(worker.submit(batch));
        worker.close();
        assertTrue(worker.awaitTermination(2_000L));

        assertEquals(2_400L, preferences.getLong(USAGE_KEY_PREFIX + BUCKET, 0L));
        assertEquals(0L, coordinator.getUnpersistedUsageMs(BUCKET));
        assertFalse(coordinator.hasActiveFlush());
    }

    @Test
    public void shutdownDrainPersistsUsageAddedDuringInFlightAndroidWrite() throws Exception {
        UsageFlushCoordinator coordinator = new UsageFlushCoordinator(0L);
        coordinator.addPendingUsage(BUCKET, 2_000L);
        UsageFlushCoordinator.FlushBatch firstBatch = coordinator.beginFlush(20_000L, true, 10_000L);
        assertTrue(firstBatch != null);

        CountDownLatch enteredFirstWrite = new CountDownLatch(1);
        CountDownLatch releaseFirstWrite = new CountDownLatch(1);
        ExecutorService executor = Executors.newSingleThreadExecutor();
        UsageFlushWorker worker = new UsageFlushWorker(
            coordinator,
            batch -> {
                enteredFirstWrite.countDown();
                try {
                    if (!releaseFirstWrite.await(2, TimeUnit.SECONDS)) return false;
                } catch (InterruptedException error) {
                    Thread.currentThread().interrupt();
                    return false;
                }
                return persistBatch(preferences, batch);
            },
            System::currentTimeMillis,
            executor
        );

        assertTrue(worker.submit(firstBatch));
        assertTrue(enteredFirstWrite.await(2, TimeUnit.SECONDS));

        coordinator.addPendingUsage(BUCKET, 3_000L);
        assertEquals(5_000L, coordinator.getUnpersistedUsageMs(BUCKET));
        assertTrue(worker.closeAfterDrainingPending());

        releaseFirstWrite.countDown();
        assertTrue(worker.awaitTermination(2_000L));

        assertEquals(5_000L, preferences.getLong(USAGE_KEY_PREFIX + BUCKET, 0L));
        assertEquals(0L, coordinator.getUnpersistedUsageMs(BUCKET));
        assertFalse(coordinator.hasActiveFlush());
    }

    private static boolean persistBatch(
        SharedPreferences preferences,
        UsageFlushCoordinator.FlushBatch batch
    ) {
        SharedPreferences.Editor editor = preferences.edit();
        for (Map.Entry<String, Long> entry : batch.increments.entrySet()) {
            String key = USAGE_KEY_PREFIX + entry.getKey();
            long existing = Math.max(0L, preferences.getLong(key, 0L));
            long increment = entry.getValue() == null ? 0L : Math.max(0L, entry.getValue());
            editor.putLong(key, saturatingAdd(existing, increment));
        }
        return editor.commit();
    }

    private static long saturatingAdd(long current, long increment) {
        if (current > Long.MAX_VALUE - increment) return Long.MAX_VALUE;
        return current + increment;
    }
}
