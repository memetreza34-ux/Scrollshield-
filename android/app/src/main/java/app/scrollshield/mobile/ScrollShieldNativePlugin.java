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

@CapacitorPlugin(name = "ScrollShieldNative")
public class ScrollShieldNativePlugin extends Plugin {
    public static final String PREFERENCES_NAME = "scrollshield_native";
    public static final String CONFIG_KEY = "protection_config";
    public static final String SERVICE_ENABLED_KEY = "protection_service_enabled";
    private static final String PROTECTION_CHANNEL_ID = "scrollshield_protection";
    private static final String EVENT_QUEUE_KEY = "protection_events";
    private static final String UNAVAILABLE_APPS_KEY = "unavailable_app_ids";
    private static final String UNAVAILABLE_ACTIVE_APPS_KEY = "unavailable_active_app_ids";
    private static final String LAST_START_REQUEST_AT_KEY = "protection_last_start_request_at";
    private static final String LAST_START_AT_KEY = "protection_last_start_at";
    private static final String LAST_STOP_AT_KEY = "protection_last_stop_at";
    private static final String LAST_STOP_CODE_KEY = "protection_last_stop_code";
    private static final String LAST_STOP_MESSAGE_KEY = "protection_last_stop_message";
    private static final int MAX_QUEUED_EVENTS = 200;
    private static final Object EVENT_LOCK = new Object();

    public enum ProtectionStartConfirmationResult {
        CONFIRMED,
        SUPERSEDED_BY_STOP,
        FAILED_CLOSED,
    }

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
        synchronized (ProtectionServiceDispatchGuard.LOCK) {
            if (!hasUsageAccess(context)) {
                rejectProtectionStartPrerequisite(
                    call,
                    context,
                    ProtectionStopReasonPolicy.USAGE_ACCESS_MISSING,
                    "Nutzungszugriff fehlt; der Android-Schutz konnte nicht gestartet werden",
                    "Usage Access is required before protection can start"
                );
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                rejectProtectionStartPrerequisite(
                    call,
                    context,
                    ProtectionStopReasonPolicy.OVERLAY_PERMISSION_MISSING,
                    "Overlay-Berechtigung fehlt; der Android-Schutz konnte nicht gestartet werden",
                    "Overlay permission is required before protection can start"
                );
                return;
            }
            if (!hasNotificationsEnabled(context)) {
                rejectProtectionStartPrerequisite(
                    call,
                    context,
                    ProtectionStopReasonPolicy.NOTIFICATIONS_MISSING,
                    "Benachrichtigungen fehlen; der Android-Schutz konnte nicht sichtbar gestartet werden",
                    "Notifications are required so active protection and its stop action remain visible"
                );
                return;
            }
            if (!hasConfiguredApps(context)) {
                rejectProtectionStartPrerequisite(
                    call,
                    context,
                    ProtectionStopReasonPolicy.TARGET_APP_MISSING,
                    "Keine aktive installierte Ziel-App ist verfügbar; der Android-Schutz konnte nicht gestartet werden",
                    "At least one installed active protected app is required"
                );
                return;
            }

            if (ScrollShieldProtectionService.isRunning() && isProtectionEnabled(context)) {
                call.resolve();
                return;
            }
            if (hasFreshProtectionStartRequest(context)) {
                call.resolve();
                return;
            }

            if (!recordProtectionStartRequested(context)) {
                persistProtectionSystemStopWithFallback(
                    context,
                    ProtectionStopReasonPolicy.START_FAILED,
                    "Android konnte die Schutzaktivierung vor dem Dienststart nicht dauerhaft speichern"
                );
                ProtectionServiceDispatchGuard.dispatchControlledStop(context);
                call.reject("Protection start request could not be persisted");
                return;
            }

            Intent intent = new Intent(context, ScrollShieldProtectionService.class);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent);
                } else {
                    context.startService(intent);
                }
                call.resolve();
            } catch (RuntimeException error) {
                persistProtectionSystemStopWithFallback(
                    context,
                    ProtectionStopReasonPolicy.START_FAILED,
                    "Android konnte den Schutzdienst nicht starten"
                );
                ProtectionServiceDispatchGuard.dispatchControlledStop(context);
                call.reject("Protection service could not be started", error);
            }
        }
    }

    private static void rejectProtectionStartPrerequisite(
        PluginCall call,
        Context context,
        String reasonCode,
        String description,
        String rejectionMessage
    ) {
        synchronized (ProtectionServiceDispatchGuard.LOCK) {
            persistProtectionSystemStopWithFallback(context, reasonCode, description);
            ProtectionServiceDispatchGuard.dispatchControlledStop(context);
            call.reject(rejectionMessage);
        }
    }

    public static void persistProtectionSystemStopWithFallback(
        Context context,
        String reasonCode,
        String description
    ) {
        synchronized (EVENT_LOCK) {
            boolean persisted = recordProtectionSystemStop(context, reasonCode, description);
            if (!persisted) {
                // Best-effort fallback after an atomic commit failure. Keep protection fail-closed and
                // retain the exact stable stop code even if the warning event cannot be committed.
                setProtectionEnabled(context, false);
                recordProtectionStop(context, reasonCode, description);
            }
        }
    }

    public static void persistProtectionTerminalStopWithFallback(
        Context context,
        String reasonCode,
        String description
    ) {
        synchronized (EVENT_LOCK) {
            boolean persisted = recordProtectionTerminalStop(context, reasonCode, description);
            if (!persisted) {
                // Best-effort fallback after an atomic commit failure. Explicit/manual terminal stops
                // intentionally do not append warning/system events.
                setProtectionEnabled(context, false);
                recordProtectionStop(context, reasonCode, description);
            }
        }
    }

    @PluginMethod
    public void stopProtectionService(PluginCall call) {
        Context context = getContext();
        String reasonCode = call.getString("reasonCode");
        String reasonMessage = call.getString("reasonMessage");
        if (reasonCode == null || reasonCode.trim().isEmpty()) {
            reasonCode = ProtectionServiceLifecyclePolicy.MANUAL_APP_STOP_CODE;
        }
        if (reasonMessage == null || reasonMessage.trim().isEmpty()) {
            reasonMessage = "Der Android-Schutz wurde in ScrollShield manuell gestoppt";
        }

        synchronized (ProtectionServiceDispatchGuard.LOCK) {
            persistProtectionTerminalStopWithFallback(context, reasonCode, reasonMessage);
            ProtectionServiceDispatchGuard.dispatchControlledStop(context);
        }
        call.resolve();
    }

    @PluginMethod
    public void getProtectionServiceStatus(PluginCall call) {
        Context context = getContext();
        JSObject result = new JSObject();
        result.put("running", ScrollShieldProtectionService.isRunning());
        result.put("enabled", isProtectionEnabled(context));
        result.put("unavailableAppIdsJson", getPreferences().getString(UNAVAILABLE_APPS_KEY, "[]"));
        result.put("lastStartRequestAt", getLastProtectionStartRequestAt(context));
        result.put("lastStartAt", getLastProtectionStartAt(context));
        result.put("lastStopAt", getLastProtectionStopAt(context));
        result.put("lastStopCode", getLastProtectionStopCode(context));
        result.put("lastStopMessage", getLastProtectionStopMessage(context));
        call.resolve(result);
    }

    @PluginMethod
    public void drainProtectionEvents(PluginCall call) {
        NativeDrainBatchStore.DrainBatch batch;
        synchronized (EVENT_LOCK) {
            try {
                batch = NativeDrainBatchStore.getOrCreate(getPreferences());
            } catch (JSONException | IllegalStateException error) {
                call.reject("Native protection data could not be prepared safely", error);
                return;
            }
        }

        JSObject result = new JSObject();
        result.put("batchId", batch.batchId);
        result.put("eventsJson", batch.eventsJson);
        result.put("usageJson", batch.usageJson);
        call.resolve(result);
    }

    @PluginMethod
    public void acknowledgeProtectionEvents(PluginCall call) {
        String batchId = call.getString("batchId");
        if (batchId == null || batchId.trim().isEmpty()) {
            call.reject("Missing native drain batch id");
            return;
        }

        synchronized (EVENT_LOCK) {
            try {
                boolean acknowledged = NativeDrainBatchStore.acknowledge(getPreferences(), batchId);
                if (!acknowledged) {
                    call.reject("Native drain batch does not match the pending batch");
                    return;
                }
            } catch (JSONException | IllegalStateException error) {
                call.reject("Native drain batch could not be acknowledged safely", error);
                return;
            }
        }

        JSObject result = new JSObject();
        result.put("acknowledged", true);
        call.resolve(result);
    }

    @PluginMethod
    public void factoryResetProtectionData(PluginCall call) {
        Context context = getContext();
        synchronized (ProtectionServiceDispatchGuard.LOCK) {
            synchronized (EVENT_LOCK) {
                if (!NativeDrainBatchStore.markFactoryReset(getPreferences())) {
                    call.reject("Native protection data could not be marked for factory reset");
                    return;
                }
            }

            // The tombstone survives any final service onDestroy usage flush. NativeDrainBatchStore
            // clears it together with any such late writes before a future drain can expose data.
            ProtectionServiceDispatchGuard.dispatchControlledStop(context);
        }
        JSObject result = new JSObject();
        result.put("resetPendingCleanup", true);
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
                boolean systemWarning = "warning".equals(type) && "system".equals(appId);
                long timestamp = systemWarning
                    ? nextLifecycleTimestamp(preferences)
                    : System.currentTimeMillis();
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
                if (systemWarning) {
                    editor
                        .putLong(LAST_STOP_AT_KEY, timestamp)
                        .putString(
                            LAST_STOP_CODE_KEY,
                            ProtectionDiagnosticPolicy.normalizeCode(
                                ProtectionStopReasonPolicy.classifySystemWarning(description),
                                "system_warning"
                            )
                        )
                        .putString(
                            LAST_STOP_MESSAGE_KEY,
                            ProtectionDiagnosticPolicy.normalizeMessage(description, "Systemwarnung")
                        );
                }
                editor.commit();
            } catch (JSONException error) {
                error.printStackTrace();
            }
        }
    }

    /**
     * Atomically records a controlled protection system stop. The enabled flag, terminal
     * diagnostics, and user-visible system warning are committed together so process death cannot
     * leave activation, event, and exact stop evidence out of sync.
     */
    public static boolean recordProtectionSystemStop(
        Context context,
        String reasonCode,
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

            try {
                long timestamp = nextLifecycleTimestamp(preferences);
                String normalizedCode = ProtectionDiagnosticPolicy.normalizeCode(
                    reasonCode,
                    ProtectionStopReasonPolicy.SYSTEM_WARNING
                );
                String normalizedMessage = ProtectionDiagnosticPolicy.normalizeMessage(
                    description,
                    "Systemwarnung"
                );

                JSONObject event = new JSONObject();
                event.put("timestamp", timestamp);
                event.put("type", "warning");
                event.put("appId", "system");
                event.put("desc", normalizedMessage);
                events.put(event);
                while (events.length() > MAX_QUEUED_EVENTS) {
                    events.remove(0);
                }

                return preferences
                    .edit()
                    .putBoolean(SERVICE_ENABLED_KEY, false)
                    .putString(EVENT_QUEUE_KEY, events.toString())
                    .putLong(LAST_STOP_AT_KEY, timestamp)
                    .putString(LAST_STOP_CODE_KEY, normalizedCode)
                    .putString(LAST_STOP_MESSAGE_KEY, normalizedMessage)
                    .commit();
            } catch (JSONException error) {
                error.printStackTrace();
                return false;
            }
        }
    }

    /**
     * Atomically records an explicit terminal stop without adding a warning event. This is used for
     * deliberate app/notification stops and other caller-supplied terminal reasons where the stop
     * itself is expected rather than a system failure.
     */
    public static boolean recordProtectionTerminalStop(
        Context context,
        String reasonCode,
        String description
    ) {
        synchronized (EVENT_LOCK) {
            SharedPreferences preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
            long timestamp = nextLifecycleTimestamp(preferences);
            String normalizedCode = ProtectionDiagnosticPolicy.normalizeCode(
                reasonCode,
                ProtectionServiceLifecyclePolicy.MANUAL_APP_STOP_CODE
            );
            String normalizedMessage = ProtectionDiagnosticPolicy.normalizeMessage(
                description,
                "Der Android-Schutz wurde gestoppt"
            );

            return preferences
                .edit()
                .putBoolean(SERVICE_ENABLED_KEY, false)
                .putLong(LAST_STOP_AT_KEY, timestamp)
                .putString(LAST_STOP_CODE_KEY, normalizedCode)
                .putString(LAST_STOP_MESSAGE_KEY, normalizedMessage)
                .commit();
        }
    }

    /**
     * Compatibility alias for existing prerequisite callers and tests. New generic system-stop
     * callers should use recordProtectionSystemStop(...).
     */
    public static boolean recordProtectionPrerequisiteStop(
        Context context,
        String reasonCode,
        String description
    ) {
        return recordProtectionSystemStop(context, reasonCode, description);
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

    public static boolean hasFreshProtectionStartRequest(Context context) {
        synchronized (EVENT_LOCK) {
            SharedPreferences preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
            return ProtectionStartHandshakePolicy.hasFreshPendingStartRequest(
                preferences.getBoolean(SERVICE_ENABLED_KEY, false),
                preferences.getLong(LAST_START_REQUEST_AT_KEY, 0L),
                preferences.getLong(LAST_START_AT_KEY, 0L),
                preferences.getLong(LAST_STOP_AT_KEY, 0L),
                System.currentTimeMillis()
            );
        }
    }

    public static boolean hasUnconfirmedProtectionStartRequest(Context context) {
        synchronized (EVENT_LOCK) {
            SharedPreferences preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
            return ProtectionStartHandshakePolicy.hasUnconfirmedStartRequest(
                preferences.getBoolean(SERVICE_ENABLED_KEY, false),
                preferences.getLong(LAST_START_REQUEST_AT_KEY, 0L),
                preferences.getLong(LAST_START_AT_KEY, 0L),
                preferences.getLong(LAST_STOP_AT_KEY, 0L)
            );
        }
    }

    /**
     * Persists activation intent and its request timestamp in one commit. The timestamp is ordered
     * strictly after every known lifecycle boundary so a same-millisecond stop -> restart cannot
     * make the new request look stale.
     */
    public static boolean recordProtectionStartRequested(Context context) {
        synchronized (EVENT_LOCK) {
            SharedPreferences preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
            long requestAt = nextLifecycleTimestamp(preferences);
            return preferences
                .edit()
                .putBoolean(SERVICE_ENABLED_KEY, true)
                .putLong(LAST_START_REQUEST_AT_KEY, requestAt)
                .commit();
        }
    }

    public static void setProtectionEnabled(Context context, boolean enabled) {
        synchronized (EVENT_LOCK) {
            SharedPreferences preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
            boolean wasEnabled = preferences.getBoolean(SERVICE_ENABLED_KEY, false);
            SharedPreferences.Editor editor = preferences.edit().putBoolean(SERVICE_ENABLED_KEY, enabled);

            if (!enabled && wasEnabled) {
                editor
                    .putLong(LAST_STOP_AT_KEY, nextLifecycleTimestamp(preferences))
                    .putString(LAST_STOP_CODE_KEY, "protection_disabled")
                    .putString(
                        LAST_STOP_MESSAGE_KEY,
                        "Der Android-Schutz wurde über App, Benachrichtigung oder System deaktiviert"
                    );
            }
            editor.commit();
        }
    }

    /**
     * Confirms that the foreground service reached a current, still-enabled activation. A terminal
     * stop that won the EVENT_LOCK first is never overwritten by a delayed service confirmation.
     */
    public static ProtectionStartConfirmationResult recordProtectionServiceStarted(Context context) {
        synchronized (EVENT_LOCK) {
            SharedPreferences preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
            boolean enabled = preferences.getBoolean(SERVICE_ENABLED_KEY, false);
            long requestAt = preferences.getLong(LAST_START_REQUEST_AT_KEY, 0L);
            long stopAt = preferences.getLong(LAST_STOP_AT_KEY, 0L);

            if (ProtectionStartHandshakePolicy.isConfirmationSuperseded(enabled, requestAt, stopAt)) {
                return ProtectionStartConfirmationResult.SUPERSEDED_BY_STOP;
            }
            if (requestAt <= 0L) {
                persistProtectionSystemStopWithFallback(
                    context,
                    ProtectionStopReasonPolicy.START_FAILED,
                    "Android konnte den Schutzstart keiner gespeicherten Startanforderung zuordnen"
                );
                return ProtectionStartConfirmationResult.FAILED_CLOSED;
            }

            boolean persisted = preferences
                .edit()
                .putLong(LAST_START_AT_KEY, nextLifecycleTimestamp(preferences))
                .commit();
            if (!persisted) {
                persistProtectionSystemStopWithFallback(
                    context,
                    ProtectionStopReasonPolicy.START_FAILED,
                    "Android konnte den bestätigten Schutzstart nicht dauerhaft speichern"
                );
                return ProtectionStartConfirmationResult.FAILED_CLOSED;
            }
            return ProtectionStartConfirmationResult.CONFIRMED;
        }
    }

    public static void recordProtectionStop(Context context, String code, String message) {
        synchronized (EVENT_LOCK) {
            SharedPreferences preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
            preferences
                .edit()
                .putLong(LAST_STOP_AT_KEY, nextLifecycleTimestamp(preferences))
                .putString(
                    LAST_STOP_CODE_KEY,
                    ProtectionDiagnosticPolicy.normalizeCode(code, "unknown_stop")
                )
                .putString(
                    LAST_STOP_MESSAGE_KEY,
                    ProtectionDiagnosticPolicy.normalizeMessage(message, "Unbekannter Stoppgrund")
                )
                .commit();
        }
    }

    public static long getLastProtectionStartRequestAt(Context context) {
        return context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getLong(LAST_START_REQUEST_AT_KEY, 0L);
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
        return ProtectionDiagnosticPolicy.normalizeCode(
            context
                .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
                .getString(LAST_STOP_CODE_KEY, ""),
            ""
        );
    }

    public static String getLastProtectionStopMessage(Context context) {
        return ProtectionDiagnosticPolicy.normalizeMessage(
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

    private static long nextLifecycleTimestamp(SharedPreferences preferences) {
        return ProtectionStartHandshakePolicy.nextLifecycleTimestamp(
            System.currentTimeMillis(),
            preferences.getLong(LAST_START_REQUEST_AT_KEY, 0L),
            preferences.getLong(LAST_START_AT_KEY, 0L),
            preferences.getLong(LAST_STOP_AT_KEY, 0L)
        );
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
}
