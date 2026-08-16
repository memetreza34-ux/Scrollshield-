package app.scrollshield.mobile;

import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Map;
import java.util.UUID;

/**
 * Durable hand-off between Android usage/event accounting and the React state layer.
 *
 * A drain creates at most one persistent pending batch. Events are moved from the live queue into
 * that batch in the same SharedPreferences commit, while usage export cursors are advanced only
 * after React explicitly acknowledges the matching batch id. Re-reading before ACK therefore
 * returns the exact same payload.
 */
final class NativeDrainBatchStore {
    static final String EVENT_QUEUE_KEY = "protection_events";
    static final String USAGE_COUNTER_PREFIX = "usage_ms_";
    static final String EXPORTED_USAGE_PREFIX = "exported_";
    static final String PENDING_BATCH_KEY = "pending_protection_drain_v1";
    static final String FACTORY_RESET_PENDING_KEY = "factory_reset_pending_v1";

    private static final int SCHEMA_VERSION = 1;

    private NativeDrainBatchStore() {}

    static DrainBatch getOrCreate(SharedPreferences preferences) throws JSONException {
        if (finalizeFactoryResetIfPending(preferences)) {
            return DrainBatch.empty();
        }

        String pendingJson = preferences.getString(PENDING_BATCH_KEY, null);
        if (pendingJson != null && !pendingJson.isEmpty()) {
            return parsePendingBatch(pendingJson);
        }

        String rawEvents = preferences.getString(EVENT_QUEUE_KEY, "[]");
        JSONArray events = new JSONArray(rawEvents == null ? "[]" : rawEvents);
        JSONArray usageSamples = new JSONArray();
        JSONObject usageCursors = new JSONObject();

        for (Map.Entry<String, ?> entry : preferences.getAll().entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            if (!key.startsWith(USAGE_COUNTER_PREFIX) || !(value instanceof Long)) continue;

            long current = (Long) value;
            String exportedKey = EXPORTED_USAGE_PREFIX + key;
            long exported = preferences.getLong(exportedKey, 0L);
            if (current < exported) exported = 0L;
            long delta = current - exported;
            if (delta <= 0L) continue;

            UsageKey usageKey = parseUsageKey(key);
            if (usageKey == null) continue;

            JSONObject sample = new JSONObject();
            sample.put("date", usageKey.date);
            sample.put("appId", usageKey.appId);
            sample.put("durationMs", delta);
            usageSamples.put(sample);
            usageCursors.put(key, current);
        }

        if (events.length() == 0 && usageSamples.length() == 0) {
            return DrainBatch.empty();
        }

        String batchId = UUID.randomUUID().toString();
        JSONObject pending = new JSONObject();
        pending.put("schemaVersion", SCHEMA_VERSION);
        pending.put("batchId", batchId);
        pending.put("eventsJson", events.toString());
        pending.put("usageJson", usageSamples.toString());
        pending.put("usageCursors", usageCursors);

        boolean committed = preferences
            .edit()
            .putString(PENDING_BATCH_KEY, pending.toString())
            .putString(EVENT_QUEUE_KEY, "[]")
            .commit();
        if (!committed) {
            throw new IllegalStateException("Could not persist native drain batch");
        }

        return new DrainBatch(batchId, events.toString(), usageSamples.toString());
    }

    static boolean acknowledge(SharedPreferences preferences, String batchId) throws JSONException {
        if (finalizeFactoryResetIfPending(preferences)) return true;
        if (batchId == null || batchId.trim().isEmpty()) return false;

        String pendingJson = preferences.getString(PENDING_BATCH_KEY, null);
        if (pendingJson == null || pendingJson.isEmpty()) {
            // ACK is intentionally idempotent once the native pending batch has already been removed.
            return true;
        }

        JSONObject pending = parsePendingObject(pendingJson);
        String pendingBatchId = pending.optString("batchId", "");
        if (!batchId.equals(pendingBatchId)) return false;

        JSONObject usageCursors = pending.optJSONObject("usageCursors");
        if (usageCursors == null) throw new JSONException("Pending batch has no usage cursors");

        // Validate the whole cursor set before mutating anything. If native counters moved backwards
        // or export state is inconsistent, keep the pending batch so a later recovery path cannot
        // silently lose usage.
        JSONArray cursorNames = usageCursors.names();
        if (cursorNames != null) {
            for (int index = 0; index < cursorNames.length(); index++) {
                String key = cursorNames.getString(index);
                if (!key.startsWith(USAGE_COUNTER_PREFIX)) {
                    throw new JSONException("Unexpected usage cursor key");
                }
                long snapshot = usageCursors.getLong(key);
                long current = preferences.getLong(key, -1L);
                long exported = preferences.getLong(EXPORTED_USAGE_PREFIX + key, 0L);
                if (snapshot < 0L || current < snapshot || exported > snapshot) {
                    throw new IllegalStateException("Native usage cursor is inconsistent");
                }
            }
        }

        SharedPreferences.Editor editor = preferences.edit();
        if (cursorNames != null) {
            for (int index = 0; index < cursorNames.length(); index++) {
                String key = cursorNames.getString(index);
                editor.putLong(EXPORTED_USAGE_PREFIX + key, usageCursors.getLong(key));
            }
        }
        editor.remove(PENDING_BATCH_KEY);
        return editor.commit();
    }

    static boolean markFactoryReset(SharedPreferences preferences) {
        return preferences
            .edit()
            .clear()
            .putBoolean(FACTORY_RESET_PENDING_KEY, true)
            .commit();
    }

    /**
     * Clears a reset tombstone together with any writes that arrived after the reset request.
     *
     * Callers that are about to expose old data or write a new post-reset configuration must call
     * this first. Returning true means a reset was pending and has now been finalized.
     */
    static boolean finalizeFactoryResetIfPending(SharedPreferences preferences) {
        if (!preferences.getBoolean(FACTORY_RESET_PENDING_KEY, false)) return false;
        if (!preferences.edit().clear().commit()) {
            throw new IllegalStateException("Could not finalize native factory reset");
        }
        return true;
    }

    static boolean hasPendingBatch(SharedPreferences preferences) {
        String pending = preferences.getString(PENDING_BATCH_KEY, null);
        return pending != null && !pending.isEmpty();
    }

    private static DrainBatch parsePendingBatch(String raw) throws JSONException {
        JSONObject pending = parsePendingObject(raw);
        String batchId = pending.getString("batchId");
        String eventsJson = pending.getString("eventsJson");
        String usageJson = pending.getString("usageJson");

        if (batchId.trim().isEmpty()) throw new JSONException("Pending batch id is empty");
        new JSONArray(eventsJson);
        new JSONArray(usageJson);
        return new DrainBatch(batchId, eventsJson, usageJson);
    }

    private static JSONObject parsePendingObject(String raw) throws JSONException {
        JSONObject pending = new JSONObject(raw);
        if (pending.optInt("schemaVersion", -1) != SCHEMA_VERSION) {
            throw new JSONException("Unsupported native drain batch schema");
        }
        return pending;
    }

    private static UsageKey parseUsageKey(String key) {
        int dateStart = USAGE_COUNTER_PREFIX.length();
        int appStart = dateStart + 11;
        if (key.length() <= appStart) return null;
        String date = key.substring(dateStart, dateStart + 10);
        if (key.charAt(dateStart + 10) != '_') return null;
        String appId = key.substring(appStart);
        if (appId.trim().isEmpty()) return null;
        return new UsageKey(date, appId);
    }

    static final class DrainBatch {
        final String batchId;
        final String eventsJson;
        final String usageJson;

        DrainBatch(String batchId, String eventsJson, String usageJson) {
            this.batchId = batchId;
            this.eventsJson = eventsJson;
            this.usageJson = usageJson;
        }

        static DrainBatch empty() {
            return new DrainBatch("", "[]", "[]");
        }
    }

    private static final class UsageKey {
        private final String date;
        private final String appId;

        private UsageKey(String date, String appId) {
            this.date = date;
            this.appId = appId;
        }
    }
}
