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

        CommitResult(boolean persisted, String generation, String previousUnavailableActiveJson) {
            this.persisted = persisted;
            this.generation = generation;
            this.previousUnavailableActiveJson = previousUnavailableActiveJson;
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
        String previousUnavailableActive = preferences.getString(UNAVAILABLE_ACTIVE_APPS_KEY, "[]");
        String generation = UUID.randomUUID().toString();
        boolean persisted = preferences
            .edit()
            .putString(ScrollShieldNativePlugin.CONFIG_KEY, configJson)
            .putString(UNAVAILABLE_APPS_KEY, unavailableJson)
            .putString(UNAVAILABLE_ACTIVE_APPS_KEY, unavailableActiveJson)
            .putString(CONFIG_GENERATION_KEY, generation)
            .commit();
        return new CommitResult(persisted, generation, previousUnavailableActive == null ? "[]" : previousUnavailableActive);
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

    private static void validateConfig(String configJson) throws JSONException {
        JSONObject root = new JSONObject(configJson);
        JSONArray apps = root.optJSONArray("apps");
        if (apps == null) throw new JSONException("Protection config must contain an apps array");
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(ScrollShieldNativePlugin.PREFERENCES_NAME, Context.MODE_PRIVATE);
    }
}
