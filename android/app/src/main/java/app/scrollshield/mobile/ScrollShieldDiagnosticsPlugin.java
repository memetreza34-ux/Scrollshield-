package app.scrollshield.mobile;

import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;
import java.util.TimeZone;

@CapacitorPlugin(name = "ScrollShieldDiagnostics")
public class ScrollShieldDiagnosticsPlugin extends Plugin {
    @PluginMethod
    public void getSnapshot(PluginCall call) {
        Context context = getContext();
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(
            Context.NOTIFICATION_SERVICE
        );

        boolean batteryExempt = powerManager != null
            && powerManager.isIgnoringBatteryOptimizations(context.getPackageName());
        boolean notificationsEnabled = Build.VERSION.SDK_INT < Build.VERSION_CODES.N
            || (notificationManager != null && notificationManager.areNotificationsEnabled());

        JSObject result = new JSObject();
        result.put("capturedAt", System.currentTimeMillis());
        result.put("manufacturer", safe(Build.MANUFACTURER));
        result.put("brand", safe(Build.BRAND));
        result.put("model", safe(Build.MODEL));
        result.put("device", safe(Build.DEVICE));
        result.put("androidRelease", safe(Build.VERSION.RELEASE));
        result.put("sdkInt", Build.VERSION.SDK_INT);
        result.put("packageName", context.getPackageName());
        result.put("locale", getLocaleTag());
        result.put("timeZone", TimeZone.getDefault().getID());
        result.put("usageAccess", ScrollShieldNativePlugin.hasUsageAccess(context));
        result.put(
            "overlay",
            Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)
        );
        result.put("notifications", notificationsEnabled);
        result.put("batteryOptimizationExempt", batteryExempt);
        result.put("protectionEnabled", ScrollShieldNativePlugin.isProtectionEnabled(context));
        result.put("serviceRunning", ScrollShieldProtectionService.isRunning());
        result.put("configuredInstalledApps", ScrollShieldNativePlugin.hasConfiguredApps(context));
        call.resolve(result);
    }

    private String getLocaleTag() {
        Locale locale = Locale.getDefault();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            return locale.toLanguageTag();
        }
        return locale.toString();
    }

    private String safe(String value) {
        return value == null ? "unknown" : value;
    }
}
