package app.scrollshield.mobile;

import android.app.AppOpsManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.os.Process;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Map;

@CapacitorPlugin(name = "ScrollShieldNative")
public class ScrollShieldNativePlugin extends Plugin {
    public static final String PREFERENCES_NAME = "scrollshield_native";
    public static final String CONFIG_KEY = "protection_config";
    public static final String SERVICE_ENABLED_KEY = "protection_service_enabled";
    private static final String PROTECTION_CHANNEL_ID = "scrollshield_protection";
    private static final String EVENT_QUEUE_KEY = "protection_events";
    private static final String UNAVAILABLE_APPS_KEY = "unavailable_app_ids";
    private static final String UNAVAILABLE_ACTIVE_APPS_KEY = "unavailable_active_app_ids";
    private static final String USAGE_COUNTER_PREFIX = "usage_ms_";
    private static final String EXPORTED_USAGE_PREFIX = "exported_";
    private static final String LAST_START_AT_KEY = "protection_last_start_at";
    private static final String LAST_STOP_AT_KEY = "protection_last_stop_at";
    private static final String LAST_STOP_CODE_KEY = "protection_last_stop_code";
    private static final String LAST_STOP_MESSAGE_KEY = "protection_last_stop_message";
    private static final int MAX_QUEUED_EVENTS = 200;
    private static final Object EVENT_LOCK = new Object();

    @PluginMethod
    public void getPermissionStatus(PluginCall call) {
        Context context = getContext();
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        boolean batteryExempt = powerManager != null
            && powerManager.isIgnoringBatteryOptimizations(context.getPackageName());

        JSObject result = new JSObject();
        result.put("usageAccess", hasUsageAccess(context));
        result.put("overlay", Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context));
        result.put("notifications", hasNotificationsEnabled(context));
        result.put("ignoreBatteryOptimization", batteryExempt);
        result.put("backgroundActivity", batteryExempt);
        call.resolve(result);
    }

    @PluginMethod
    public void openPermissionSettings(PluginCall call) {
        String permission = call.getString("permission");
        if (permission == null) {
            call.reject("Missing permission name");
            return;
        }

        Intent intent;
        switch (permission) {
            case "usageAccess":
                intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                break;
            case "overlay":
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                    call.resolve();
                    return;
                }
                intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName())
                );
                break;
            case "notifications":
                intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
                break;
            case "ignoreBatteryOptimization":
            case "backgroundActivity":
                intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                break;
            default:
                call.reject("Unsupported permission: " + permission);
                return;
        }

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException error) {
            openApplicationSettings(call, error);
        }
    }

    @PluginMethod
    public void syncProtectionConfig(PluginCall call) {
        String configJson = call.getString("configJson");
        if (configJson == null) {
            call.reject("Missing protection configuration");
            return;
        }

        Context context = getContext();
        JSONArray unavailableApps = getUnavailableAppIds(context, configJson, false);
        JSONArray unavailableActiveApps = getUnavailableAppIds(context, configJson, true);
        String unavailableJson = unavailableApps.toString();
        String unavailableActiveJson = unavailableActiveApps.toString();
        SharedPreferences preferences = getPreferences();
        String previousUnavailableActive = preferences.getString(UNAVAILABLE_ACTIVE_APPS_KEY, "[]");
        preferences
            .edit()
            .putString(CONFIG_KEY, configJson)
            .putString(UNAVAILABLE_APPS_KEY, unavailableJson)
            .putString(UNAVAILABLE_ACTIVE_APPS_KEY, unavailableActiveJson)
            .apply();

        if (!unavailableActiveJson.equals(previousUnavailableActive)) {
            for (int index = 0; index < unavailableActiveApps.length(); index++) {
                String appId = unavailableActiveApps.optString(index, "");
                if (!appId.isEmpty()) {
                    appendProtectionEvent(
                        context,
                        "warning",
                        appId,
                        "App ist nicht installiert oder für Android nicht sichtbar; Schutz ist für diese App inaktiv"
                    );
                }
            }
        }

        JSObject result = new JSObject();
        result.put("unavailableAppIdsJson", unavailableJson);
        call.resolve(result);
    }

    @PluginMethod
    public void startProtectionService(PluginCall call) {
        Context context = getContext();
        if (!hasUsageAccess(context)) {
            call.reject("Usage Access is required before protection can start");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            call.reject("Overlay permission is required before protection can start");
            return;
        }
        if (!hasNotificationsEnabled(context)) {
            call.reject("Notifications are required so active protection and its stop action remain visible");
            return;
        }
        if (!hasConfiguredApps(context)) {
            call.reject("At least one installed active protected app is required");
            return;
        }

        setProtectionEnabled(context, true);
        Intent intent = new Intent(context, ScrollShieldProtectionService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            call.resolve();
        } catch (RuntimeException error) {
            setProtectionEnabled(context, false);
            recordProtectionStop(
                context,
                "start_failed",
                "Android konnte den Schutzdienst nicht starten"
            );
            call.reject("Protection service could not be started", error);
        }
    }

    @PluginMethod
    public void stopProtectionService(PluginCall call) {
        Context context = getContext();
        String reasonCode = call.getString("reasonCode");
        String reasonMessage = call.getString("reasonMessage");
        if (reasonCode == null || reasonCode.trim().isEmpty()) reasonCode = "manual_app_stop";
        if (reasonMessage == null || reasonMessage.trim().isEmpty()) {
            reasonMessage = "Der Android-Schutz wurde in ScrollShield manuell gestoppt";
        }

        setProtectionEnabled(context, false);
        recordProtectionStop(context, reasonCode, reasonMessage);
        context.stopService(new Intent(context, ScrollShieldProtectionService.class));
        call.resolve();
    }

    @PluginMethod
    public void getProtectionServiceStatus(PluginCall call) {
        Context context = getContext();
        JSObject result = new JSObject();
        result.put("running", ScrollShieldProtectionService.isRunning());
        result.put("enabled", isProtectionEnabled(context));
        result.put("unavailableAppIdsJson", getPreferences().getString(UNAVAILABLE_APPS_KEY, "[]"));
        result.put("lastStartAt", getLastProtectionStartAt(context));
        result.put("lastStopAt", getLastProtectionStopAt(context));
        result.put("lastStopCode", getLastProtectionStopCode(context));
        result.put("lastStopMessage", getLastProtectionStopMessage(context));
        call.resolve(result);
    }

    @PluginMethod
    public void drainProtectionEvents(PluginCall call) {
        String eventsJson;
        JSONArray usageSamples = new JSONArray();
        synchronized (EVENT_LOCK) {
            SharedPreferences preferences = getPreferences();
            eventsJson = preferences.getString(EVENT_QUEUE_KEY, "[]");
            SharedPreferences.Editor editor = preferences.edit().putString(EVENT_QUEUE_KEY, "[]");

            for (Map.Entry<String, ?> entry : preferences.getAll().entrySet()) {
                String key = entry.getKey();
                Object value = entry.getValue();
                if (!key.startsWith(USAGE_COUNTER_PREFIX) || !(value instanceof Long)) continue;

                long current = (Long) value;
                String exportedKey = EXPORTED_USAGE_PREFIX + key;
                long exported = preferences.getLong(exportedKey, 0L);
                if (current < exported) exported = 0L;
                long delta = current - exported;
                editor.putLong(exportedKey, current);
                if (delta <= 0L) continue;

                UsageKey usageKey = parseUsageKey(key);
                if (usageKey == null) continue;
                try {
                    JSONObject sample = new JSONObject();
                    sample.put("date", usageKey.date);
                    sample.put("appId", usageKey.appId);
                    sample.put("durationMs", delta);
                    usageSamples.put(sample);
                } catch (JSONException error) {
                    error.printStackTrace();
                }
            }
            editor.commit();
        }

        JSObject result = new JSObject();
        result.put("eventsJson", eventsJson == null ? "[]" : eventsJson);
        result.put("usageJson", usageSamples.toString());
        call.resolve(result);
    }

    public static void appendProtectionEvent(
        Context context,
        String type,
        String appId,
        String description
    ) {
        synchronized (EVENT_LOCK) {
            SharedPreferences preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
            JSONArray events;
            try {
                String existing = preferences.getString(EVENT_QUEUE_KEY, "[]");
                events = new JSONArray(existing == null ? "[]" : existing);
            } catch (JSONException error) {
                events = new JSONArray();
            }

            JSONObject event = new JSONObject();
            try {
                long timestamp = System.currentTimeMillis();
                event.put("timestamp", timestamp);
                event.put("type", type);
                event.put("appId", appId);
                event.put("desc", description);
                events.put(event);
                while (events.length() > MAX_QUEUED_EVENTS) {
                    events.remove(0);
                }

                SharedPreferences.Editor editor = preferences
                    .edit()
                    .putString(EVENT_QUEUE_KEY, events.toString());
                if ("warning".equals(type) && "system".equals(appId)) {
                    editor
                        .putLong(LAST_STOP_AT_KEY, timestamp)
                        .putString(
                            LAST_STOP_CODE_KEY,
                            ProtectionStopReasonPolicy.classifySystemWarning(description)
                        )
                        .putString(LAST_STOP_MESSAGE_KEY, safeDiagnosticText(description, "Systemwarnung"));
                }
                editor.commit();
            } catch (JSONException error) {
                error.printStackTrace();
            }
        }
    }

    public static boolean hasUsageAccess(Context context) {
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) return false;

        int mode;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            mode = appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.getPackageName()
            );
        } else {
            mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.getPackageName()
            );
        }
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    public static boolean hasNotificationsEnabled(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return true;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || !manager.areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true;

        NotificationChannel channel = manager.getNotificationChannel(PROTECTION_CHANNEL_ID);
        return channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
    }

    public static boolean isProtectionEnabled(Context context) {
        return context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getBoolean(SERVICE_ENABLED_KEY, false);
    }

    public static void setProtectionEnabled(Context context, boolean enabled) {
        SharedPreferences preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
        boolean wasEnabled = preferences.getBoolean(SERVICE_ENABLED_KEY, false);
        long now = System.currentTimeMillis();
        SharedPreferences.Editor editor = preferences.edit().putBoolean(SERVICE_ENABLED_KEY, enabled);

        if (enabled) {
            editor.putLong(LAST_START_AT_KEY, now);
        } else if (wasEnabled) {
            editor
                .putLong(LAST_STOP_AT_KEY, now)
                .putString(LAST_STOP_CODE_KEY, "protection_disabled")
                .putString(
                    LAST_STOP_MESSAGE_KEY,
                    "Der Android-Schutz wurde über App, Benachrichtigung oder System deaktiviert"
                );
        }
        editor.commit();
    }

    public static void recordProtectionStop(Context context, String code, String message) {
        context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(LAST_STOP_AT_KEY, System.currentTimeMillis())
            .putString(LAST_STOP_CODE_KEY, safeDiagnosticText(code, "unknown_stop"))
            .putString(LAST_STOP_MESSAGE_KEY, safeDiagnosticText(message, "Unbekannter Stoppgrund"))
            .commit();
    }

    public static long getLastProtectionStartAt(Context context) {
        return context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getLong(LAST_START_AT_KEY, 0L);
    }

    public static long getLastProtectionStopAt(Context context) {
        return context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getLong(LAST_STOP_AT_KEY, 0L);
    }

    public static String getLastProtectionStopCode(Context context) {
        return safeDiagnosticText(
            context
                .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
                .getString(LAST_STOP_CODE_KEY, ""),
            ""
        );
    }

    public static String getLastProtectionStopMessage(Context context) {
        return safeDiagnosticText(
            context
                .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
                .getString(LAST_STOP_MESSAGE_KEY, ""),
            ""
        );
    }

    public static boolean hasConfiguredApps(Context context) {
        SharedPreferences preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
        String configJson = preferences.getString(CONFIG_KEY, "{}");
        try {
            JSONObject root = new JSONObject(configJson == null ? "{}" : configJson);
            JSONArray apps = root.optJSONArray("apps");
            if (apps == null) return false;

            for (int index = 0; index < apps.length(); index++) {
                JSONObject app = apps.optJSONObject(index);
                if (app == null || !app.optBoolean("active", false)) continue;
                JSONArray packages = app.optJSONArray("packages");
                if (hasInstalledPackage(context, packages)) return true;
            }
            return false;
        } catch (JSONException error) {
            return false;
        }
    }

    private static JSONArray getUnavailableAppIds(Context context, String configJson, boolean activeOnly) {
        JSONArray unavailable = new JSONArray();
        try {
            JSONObject root = new JSONObject(configJson);
            JSONArray apps = root.optJSONArray("apps");
            if (apps == null) return unavailable;

            for (int index = 0; index < apps.length(); index++) {
                JSONObject app = apps.optJSONObject(index);
                if (app == null) continue;
                if (activeOnly && !app.optBoolean("active", false)) continue;
                JSONArray packages = app.optJSONArray("packages");
                if (!hasInstalledPackage(context, packages)) {
                    unavailable.put(app.optString("id", "unknown"));
                }
            }
        } catch (JSONException ignored) {
            // Invalid configurations are rejected by the TypeScript state layer before synchronization.
        }
        return unavailable;
    }

    private static boolean hasInstalledPackage(Context context, JSONArray packages) {
        if (packages == null || packages.length() == 0) return false;
        PackageManager packageManager = context.getPackageManager();
        for (int index = 0; index < packages.length(); index++) {
            String packageName = packages.optString(index, "");
            if (packageName.isEmpty()) continue;
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    packageManager.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(0L));
                } else {
                    packageManager.getPackageInfo(packageName, 0);
                }
                return true;
            } catch (PackageManager.NameNotFoundException | SecurityException ignored) {
                // Try the next known regional package.
            }
        }
        return false;
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

    private static String safeDiagnosticText(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }

    private SharedPreferences getPreferences() {
        return getContext().getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
    }

    private void openApplicationSettings(PluginCall call, Exception originalError) {
        try {
            Intent fallback = new Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getContext().getPackageName())
            );
            fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(fallback);
            call.resolve();
        } catch (ActivityNotFoundException fallbackError) {
            call.reject("Android settings screen is unavailable", originalError);
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
