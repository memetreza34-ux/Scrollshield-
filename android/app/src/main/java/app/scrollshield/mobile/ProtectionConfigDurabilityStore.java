package app.scrollshield.mobile;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.UUID;

final class ProtectionConfigDurabilityStore {
    static final String CONFIG_GENERATION_KEY = "protection_config_generation";
    static final String START_REQUEST_CONFIG_GENERATION_KEY = "protection_start_request_config_generation";

    private static final String UNAVAILABLE_APPS_KEY = "unavailable_app_ids";
    private static final String UNAVAILABLE_ACTIVE_APPS_KEY = "unavailable_active_app_ids";

    static final class CommitResult {
        final boolean persisted;
        final String generation;
        final String previousUnavailableActiveJson;
        final boolean rollbackPersisted;

        CommitResult(
            boolean persisted,
            String generation,
            String previousUnavailableActiveJson,
            boolean rollbackPersisted
        ) {
            this.persisted = persisted;
            this.generation = generation;
            this.previousUnavailableActiveJson = previousUnavailableActiveJson;
            this.rollbackPersisted = rollbackPersisted;
        }
    }

    private static final class PreferenceSnapshot {
        final boolean hadConfig;
        final String configJson;
        final boolean hadUnavailableApps;
        final String unavailableJson;
        final boolean hadUnavailableActiveApps;
        final String unavailableActiveJson;
        final boolean hadGeneration;
        final String generation;

        PreferenceSnapshot(SharedPreferences preferences) {
            hadConfig = preferences.contains(ScrollShieldNativePlugin.CONFIG_KEY);
            configJson = preferences.getString(ScrollShieldNativePlugin.CONFIG_KEY, "");
            hadUnavailableApps = preferences.contains(UNAVAILABLE_APPS_KEY);
            unavailableJson = preferences.getString(UNAVAILABLE_APPS_KEY, "[]");
            hadUnavailableActiveApps = preferences.contains(UNAVAILABLE_ACTIVE_APPS_KEY);
            unavailableActiveJson = preferences.getString(UNAVAILABLE_ACTIVE_APPS_KEY, "[]");
            hadGeneration = preferences.contains(CONFIG_GENERATION_KEY);
            generation = preferences.getString(CONFIG_GENERATION_KEY, "");
        }
    }

    private ProtectionConfigDurabilityStore() {}

    static CommitResult commitConfig(
        Context context,
        String configJson,
        String unavailableJson,
        String unavailableActiveJson
    ) throws JSONException {
        validateConfig(configJson);
        SharedPreferences preferences = preferences(context);
        PreferenceSnapshot previous = new PreferenceSnapshot(preferences);
        String previousUnavailableActive = previous.unavailableActiveJson;
        String generation = UUID.randomUUID().toString();
        boolean persisted = preferences
            .edit()
            .putString(ScrollShieldNativePlugin.CONFIG_KEY, configJson)
            .putString(UNAVAILABLE_APPS_KEY, unavailableJson)
            .putString(UNAVAILABLE_ACTIVE_APPS_KEY, unavailableActiveJson)
            .putString(CONFIG_GENERATION_KEY, generation)
            .commit();

        if (persisted) {
            return new CommitResult(
                true,
                generation,
                previousUnavailableActive == null ? "[]" : previousUnavailableActive,
                true
            );
        }

        // SharedPreferences may expose Editor changes to this process even when disk persistence
        // fails. Restore the complete previous tuple before releasing the dispatch lock so the
        // running service cannot consume a candidate config that was never durably accepted.
        boolean rollbackPersisted = restoreSnapshot(preferences, previous);
        return new CommitResult(
            false,
            "",
            previousUnavailableActive == null ? "[]" : previousUnavailableActive,
            rollbackPersisted
        );
    }

    static String ensureGenerationForExistingConfig(Context context) {
        SharedPreferences preferences = preferences(context);
        String current = normalizeGeneration(preferences.getString(CONFIG_GENERATION_KEY, ""));
        if (!current.isEmpty()) return current;

        String configJson = preferences.getString(ScrollShieldNativePlugin.CONFIG_KEY, "");
        if (configJson == null || configJson.trim().isEmpty()) return "";
        try {
            validateConfig(configJson);
        } catch (JSONException error) {
            return "";
        }

        String generation = UUID.randomUUID().toString();
        return preferences.edit().putString(CONFIG_GENERATION_KEY, generation).commit() ? generation : "";
    }

    static String getCurrentGeneration(Context context) {
        return normalizeGeneration(preferences(context).getString(CONFIG_GENERATION_KEY, ""));
    }

    static String getStartRequestGeneration(SharedPreferences preferences) {
        return normalizeGeneration(preferences.getString(START_REQUEST_CONFIG_GENERATION_KEY, ""));
    }

    static boolean matchesCurrentGeneration(Context context, String expectedGeneration) {
        String expected = normalizeGeneration(expectedGeneration);
        return !expected.isEmpty() && expected.equals(getCurrentGeneration(context));
    }

    static boolean isCurrentRequestGeneration(SharedPreferences preferences) {
        String current = normalizeGeneration(preferences.getString(CONFIG_GENERATION_KEY, ""));
        String requested = getStartRequestGeneration(preferences);
        return !current.isEmpty() && current.equals(requested);
    }

    static String normalizeGeneration(String value) {
        if (value == null) return "";
        String normalized = value.trim().toLowerCase();
        try {
            return UUID.fromString(normalized).toString();
        } catch (IllegalArgumentException error) {
            return "";
        }
    }

    private static boolean restoreSnapshot(
        SharedPreferences preferences,
        PreferenceSnapshot snapshot
    ) {
        SharedPreferences.Editor rollback = preferences.edit();
        restoreString(
            rollback,
            ScrollShieldNativePlugin.CONFIG_KEY,
            snapshot.hadConfig,
            snapshot.configJson
        );
        restoreString(
            rollback,
            UNAVAILABLE_APPS_KEY,
            snapshot.hadUnavailableApps,
            snapshot.unavailableJson
        );
        restoreString(
            rollback,
            UNAVAILABLE_ACTIVE_APPS_KEY,
            snapshot.hadUnavailableActiveApps,
            snapshot.unavailableActiveJson
        );
        restoreString(
            rollback,
            CONFIG_GENERATION_KEY,
            snapshot.hadGeneration,
            snapshot.generation
        );
        return rollback.commit();
    }

    private static void restoreString(
        SharedPreferences.Editor editor,
        String key,
        boolean existed,
        String value
    ) {
        if (existed) {
            editor.putString(key, value);
        } else {
            editor.remove(key);
        }
    }

    private static void validateConfig(String configJson) throws JSONException {
        JSONObject root = new JSONObject(configJson);
        JSONArray apps = root.optJSONArray("apps");
        if (apps == null) throw new JSONException("Protection config must contain an apps array");
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(ScrollShieldNativePlugin.PREFERENCES_NAME, Context.MODE_PRIVATE);
    }
}
