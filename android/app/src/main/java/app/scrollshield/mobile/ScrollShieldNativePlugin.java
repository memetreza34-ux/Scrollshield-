package app.scrollshield.mobile;

import android.app.AppOpsManager;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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
    private static final String EVENT_QUEUE_KEY = "protection_events";
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

        getPreferences().edit().putString(CONFIG_KEY, configJson).apply();
        call.resolve();
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
        if (!hasConfiguredApps(context)) {
            call.reject("At least one active protected app is required");
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
            call.reject("Protection service could not be started", error);
        }
    }

    @PluginMethod
    public void stopProtectionService(PluginCall call) {
        Context context = getContext();
        setProtectionEnabled(context, false);
        context.stopService(new Intent(context, ScrollShieldProtectionService.class));
        call.resolve();
    }

    @PluginMethod
    public void getProtectionServiceStatus(PluginCall call) {
        Context context = getContext();
        JSObject result = new JSObject();
        result.put("running", ScrollShieldProtectionService.isRunning());
        result.put("enabled", isProtectionEnabled(context));
        call.resolve(result);
    }

    @PluginMethod
    public void drainProtectionEvents(PluginCall call) {
        String eventsJson;
        synchronized (EVENT_LOCK) {
            SharedPreferences preferences = getPreferences();
            eventsJson = preferences.getString(EVENT_QUEUE_KEY, "[]");
            preferences.edit().putString(EVENT_QUEUE_KEY, "[]").commit();
        }

        JSObject result = new JSObject();
        result.put("eventsJson", eventsJson == null ? "[]" : eventsJson);
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
                event.put("timestamp", System.currentTimeMillis());
                event.put("type", type);
                event.put("appId", appId);
                event.put("desc", description);
                events.put(event);
                while (events.length() > MAX_QUEUED_EVENTS) {
                    events.remove(0);
                }
                preferences.edit().putString(EVENT_QUEUE_KEY, events.toString()).commit();
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

    public static boolean isProtectionEnabled(Context context) {
        return context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getBoolean(SERVICE_ENABLED_KEY, false);
    }

    public static void setProtectionEnabled(Context context, boolean enabled) {
        context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(SERVICE_ENABLED_KEY, enabled)
            .commit();
    }

    public static boolean hasConfiguredApps(Context context) {
        SharedPreferences preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
        String configJson = preferences.getString(CONFIG_KEY, "{}");
        try {
            JSONObject root = new JSONObject(configJson == null ? "{}" : configJson);
            JSONArray apps = root.optJSONArray("apps");
            return apps != null && apps.length() > 0;
        } catch (JSONException error) {
            return false;
        }
    }

    private SharedPreferences getPreferences() {
        return getContext().getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
    }

    private boolean hasNotificationsEnabled(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return true;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        return manager != null && manager.areNotificationsEnabled();
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
