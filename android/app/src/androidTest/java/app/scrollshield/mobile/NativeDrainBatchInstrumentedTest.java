package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class NativeDrainBatchInstrumentedTest {
    private static final String USAGE_KEY = "usage_ms_2026-08-16_instagram";
    private static final String EXPORTED_KEY = "exported_" + USAGE_KEY;

    private SharedPreferences preferences;

    @Before
    public void setUp() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        preferences = context.getSharedPreferences(ScrollShieldNativePlugin.PREFERENCES_NAME, Context.MODE_PRIVATE);
        preferences.edit().clear().commit();

        JSONArray events = new JSONArray();
        events.put(
            new JSONObject()
                .put("timestamp", 1_786_000_000_000L)
                .put("type", "block")
                .put("appId", "instagram")
                .put("desc", "Instagram wurde blockiert")
        );
        preferences
            .edit()
            .putString(NativeDrainBatchStore.EVENT_QUEUE_KEY, events.toString())
            .putLong(USAGE_KEY, 120_000L)
            .putLong(EXPORTED_KEY, 60_000L)
            .commit();
    }

    @After
    public void tearDown() {
        preferences.edit().clear().commit();
    }

    @Test
    public void pendingBatchReplaysExactlyUntilMatchingAck() throws Exception {
        NativeDrainBatchStore.DrainBatch first = NativeDrainBatchStore.getOrCreate(preferences);
        NativeDrainBatchStore.DrainBatch replay = NativeDrainBatchStore.getOrCreate(preferences);

        assertFalse(first.batchId.isEmpty());
        assertEquals(first.batchId, replay.batchId);
        assertEquals(first.eventsJson, replay.eventsJson);
        assertEquals(first.usageJson, replay.usageJson);
        assertEquals("[]", preferences.getString(NativeDrainBatchStore.EVENT_QUEUE_KEY, null));
        assertEquals(60_000L, preferences.getLong(EXPORTED_KEY, -1L));
        assertTrue(NativeDrainBatchStore.hasPendingBatch(preferences));

        assertTrue(NativeDrainBatchStore.acknowledge(preferences, first.batchId));
        assertEquals(120_000L, preferences.getLong(EXPORTED_KEY, -1L));
        assertFalse(NativeDrainBatchStore.hasPendingBatch(preferences));
    }

    @Test
    public void wrongAckCannotAdvanceUsageOrRemovePendingBatch() throws Exception {
        NativeDrainBatchStore.DrainBatch batch = NativeDrainBatchStore.getOrCreate(preferences);

        assertFalse(
            NativeDrainBatchStore.acknowledge(
                preferences,
                "ffffffff-ffff-4fff-8fff-ffffffffffff"
            )
        );
        assertEquals(60_000L, preferences.getLong(EXPORTED_KEY, -1L));
        assertTrue(NativeDrainBatchStore.hasPendingBatch(preferences));
        assertEquals(batch.batchId, NativeDrainBatchStore.getOrCreate(preferences).batchId);
    }

    @Test
    public void eventsCreatedAfterBatchStayQueuedWhenOldBatchIsAcknowledged() throws Exception {
        NativeDrainBatchStore.DrainBatch batch = NativeDrainBatchStore.getOrCreate(preferences);

        JSONArray laterEvents = new JSONArray();
        laterEvents.put(
            new JSONObject()
                .put("timestamp", 1_786_000_100_000L)
                .put("type", "warning")
                .put("appId", "youtube")
                .put("desc", "Späteres Ereignis")
        );
        preferences
            .edit()
            .putString(NativeDrainBatchStore.EVENT_QUEUE_KEY, laterEvents.toString())
            .commit();

        assertTrue(NativeDrainBatchStore.acknowledge(preferences, batch.batchId));
        assertEquals(laterEvents.toString(), preferences.getString(NativeDrainBatchStore.EVENT_QUEUE_KEY, null));

        NativeDrainBatchStore.DrainBatch next = NativeDrainBatchStore.getOrCreate(preferences);
        assertFalse(next.batchId.isEmpty());
        assertFalse(next.batchId.equals(batch.batchId));
        assertEquals(laterEvents.toString(), next.eventsJson);
    }

    @Test
    public void usageAccumulatedWhilePendingBecomesNextDeltaAfterAck() throws Exception {
        NativeDrainBatchStore.DrainBatch batch = NativeDrainBatchStore.getOrCreate(preferences);
        preferences.edit().putLong(USAGE_KEY, 180_000L).commit();

        assertEquals(batch.batchId, NativeDrainBatchStore.getOrCreate(preferences).batchId);
        assertTrue(NativeDrainBatchStore.acknowledge(preferences, batch.batchId));
        assertEquals(120_000L, preferences.getLong(EXPORTED_KEY, -1L));

        NativeDrainBatchStore.DrainBatch next = NativeDrainBatchStore.getOrCreate(preferences);
        JSONArray usage = new JSONArray(next.usageJson);
        assertEquals(1, usage.length());
        assertEquals(60_000L, usage.getJSONObject(0).getLong("durationMs"));
    }

    @Test
    public void acknowledgeIsIdempotentAfterSuccessfulRemoval() throws Exception {
        NativeDrainBatchStore.DrainBatch batch = NativeDrainBatchStore.getOrCreate(preferences);
        assertTrue(NativeDrainBatchStore.acknowledge(preferences, batch.batchId));
        assertTrue(NativeDrainBatchStore.acknowledge(preferences, batch.batchId));
    }

    @Test
    public void factoryResetTombstoneDeletesLateServiceFlushBeforeAnyReplay() throws Exception {
        NativeDrainBatchStore.getOrCreate(preferences);
        assertTrue(NativeDrainBatchStore.markFactoryReset(preferences));
        assertTrue(preferences.getBoolean(NativeDrainBatchStore.FACTORY_RESET_PENDING_KEY, false));

        preferences
            .edit()
            .putLong(USAGE_KEY, 240_000L)
            .putString(
                NativeDrainBatchStore.EVENT_QUEUE_KEY,
                new JSONArray()
                    .put(
                        new JSONObject()
                            .put("timestamp", 1_786_000_200_000L)
                            .put("type", "warning")
                            .put("appId", "system")
                            .put("desc", "late flush")
                    )
                    .toString()
            )
            .commit();

        NativeDrainBatchStore.DrainBatch afterReset = NativeDrainBatchStore.getOrCreate(preferences);
        assertEquals("", afterReset.batchId);
        assertEquals("[]", afterReset.eventsJson);
        assertEquals("[]", afterReset.usageJson);
        assertTrue(preferences.getAll().isEmpty());
    }

    @Test
    public void resetCleanupPreservesOnlyFreshPostResetConfiguration() throws Exception {
        assertTrue(NativeDrainBatchStore.markFactoryReset(preferences));

        String freshConfig = "{\"focusMode\":false,\"apps\":[]}";
        preferences
            .edit()
            .putString(ScrollShieldNativePlugin.CONFIG_KEY, freshConfig)
            .putString("unavailable_app_ids", "[]")
            .putString("unavailable_active_app_ids", "[]")
            .putLong(USAGE_KEY, 999_000L)
            .putString(NativeDrainBatchStore.EVENT_QUEUE_KEY, "[{\"type\":\"warning\"}]")
            .commit();

        assertTrue(NativeDrainBatchStore.finalizeFactoryResetIfPending(preferences));
        assertEquals(freshConfig, preferences.getString(ScrollShieldNativePlugin.CONFIG_KEY, null));
        assertEquals("[]", preferences.getString("unavailable_app_ids", null));
        assertEquals("[]", preferences.getString("unavailable_active_app_ids", null));
        assertFalse(preferences.contains(USAGE_KEY));
        assertFalse(preferences.contains(NativeDrainBatchStore.EVENT_QUEUE_KEY));
        assertFalse(preferences.contains(NativeDrainBatchStore.FACTORY_RESET_PENDING_KEY));
        assertEquals(3, preferences.getAll().size());
    }
}
