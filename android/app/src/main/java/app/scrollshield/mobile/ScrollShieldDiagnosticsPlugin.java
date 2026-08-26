package app.scrollshield.mobile;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
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
    private static final String PROTECTION_CHANNEL_ID = "scrollshield_protection";

    @PluginMethod
    public void getSnapshot(PluginCall call) {
        Context context = getContext();
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        boolean batteryExempt = powerManager != null
            && powerManager.isIgnoringBatteryOptimizations(context.getPackageName());
        NotificationHealth notificationHealth = getNotificationHealth(context);
        PackageVersion packageVersion = getPackageVersion(context);

        JSObject result = new JSObject();
        result.put("capturedAt", System.currentTimeMillis());
        result.put("manufacturer", safe(Build.MANUFACTURER));
        result.put("brand", safe(Build.BRAND));
        result.put("model", safe(Build.MODEL));
        result.put("device", safe(Build.DEVICE));
        result.put("androidRelease", safe(Build.VERSION.RELEASE));
        result.put("sdkInt", Build.VERSION.SDK_INT);
        result.put("packageName", context.getPackageName());
        result.put("versionName", packageVersion.versionName);
        result.put("versionCode", packageVersion.versionCode);
        result.put("locale", getLocaleTag());
        result.put("timeZone", TimeZone.getDefault().getID());
        result.put("usageAccess", ScrollShieldNativePlugin.hasUsageAccess(context));
        result.put(
            "overlay",
            Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)
        );
        result.put("appNotificationsEnabled", notificationHealth.appNotificationsEnabled);
        result.put("protectionChannelCreated", notificationHealth.protectionChannelCreated);
        result.put("protectionChannelEnabled", notificationHealth.protectionChannelEnabled);
        result.put("notifications", ScrollShieldNativePlugin.hasNotificationsEnabled(context));
        result.put("batteryOptimizationExempt", batteryExempt);
        result.put("protectionEnabled", ScrollShieldNativePlugin.isProtectionEnabled(context));
        result.put("serviceRunning", ScrollShieldProtectionService.isRunning());
        result.put("configuredInstalledApps", ScrollShieldNativePlugin.hasConfiguredApps(context));
        result.put("protectionConfigGeneration", ProtectionConfigDurabilityStore.getCurrentGeneration(context));
        result.put("protectionConfigWriteStateCertain", ProtectionConfigDurabilityStore.isWriteStateCertain());
        result.put(
            "startRequestConfigGeneration",
            ProtectionConfigDurabilityStore.getStartRequestGeneration(
                context.getSharedPreferences(ScrollShieldNativePlugin.PREFERENCES_NAME, Context.MODE_PRIVATE)
            )
        );
        result.put(
            "lastProtectionStartRequestAt",
            ScrollShieldNativePlugin.getLastProtectionStartRequestAt(context)
        );
        result.put("lastProtectionStartAt", ScrollShieldNativePlugin.getLastProtectionStartAt(context));
        result.put("lastProtectionStopAt", ScrollShieldNativePlugin.getLastProtectionStopAt(context));
        result.put("lastProtectionStopCode", ScrollShieldNativePlugin.getLastProtectionStopCode(context));
        result.put("lastProtectionStopMessage", ScrollShieldNativePlugin.getLastProtectionStopMessage(context));
        call.resolve(result);
    }

    private PackageVersion getPackageVersion(Context context) {
        try {
            PackageInfo packageInfo;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageInfo = context
                    .getPackageManager()
                    .getPackageInfo(context.getPackageName(), PackageManager.PackageInfoFlags.of(0L));
            } else {
                packageInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            }

            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? packageInfo.getLongVersionCode()
                : packageInfo.versionCode;
            return new PackageVersion(safe(packageInfo.versionName), versionCode);
        } catch (PackageManager.NameNotFoundException | RuntimeException error) {
            return new PackageVersion("unknown", 0L);
        }
    }

    private NotificationHealth getNotificationHealth(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            return new NotificationHealth(true, false, true);
        }

        NotificationManager manager = (NotificationManager) context.getSystemService(
            Context.NOTIFICATION_SERVICE
        );
        if (manager == null) {
            return new NotificationHealth(false, false, Build.VERSION.SDK_INT < Build.VERSION_CODES.O);
        }

        boolean appNotificationsEnabled = manager.areNotificationsEnabled();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return new NotificationHealth(appNotificationsEnabled, false, true);
        }

        NotificationChannel channel = manager.getNotificationChannel(PROTECTION_CHANNEL_ID);
        boolean channelCreated = channel != null;
        boolean channelEnabled = channel == null
            || channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
        return new NotificationHealth(appNotificationsEnabled, channelCreated, channelEnabled);
    }

    private String getLocaleTag() {
        Locale locale = Locale.getDefault();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            return locale.toLanguageTag();
        }
        return locale.toString();
    }

    private String safe(String value) {
        return value == null || value.trim().isEmpty() ? "unknown" : value;
    }

    private static final class PackageVersion {
        private final String versionName;
        private final long versionCode;

        private PackageVersion(String versionName, long versionCode) {
            this.versionName = versionName;
            this.versionCode = versionCode;
        }
    }

    private static final class NotificationHealth {
        private final boolean appNotificationsEnabled;
        private final boolean protectionChannelCreated;
        private final boolean protectionChannelEnabled;

        private NotificationHealth(
            boolean appNotificationsEnabled,
            boolean protectionChannelCreated,
            boolean protectionChannelEnabled
        ) {
            this.appNotificationsEnabled = appNotificationsEnabled;
            this.protectionChannelCreated = protectionChannelCreated;
            this.protectionChannelEnabled = protectionChannelEnabled;
        }
    }
}
