package app.scrollshield.mobile;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

public class ScrollShieldBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
            && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            return;
        }

        if (!ScrollShieldNativePlugin.isProtectionEnabled(context)) return;
        if (!ScrollShieldNativePlugin.hasConfiguredApps(context)) return;
        if (!ScrollShieldNativePlugin.hasUsageAccess(context)) return;
        if (!ScrollShieldNativePlugin.hasNotificationsEnabled(context)) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) return;

        Intent serviceIntent = new Intent(context, ScrollShieldProtectionService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (RuntimeException error) {
            ScrollShieldNativePlugin.appendProtectionEvent(
                context,
                "warning",
                "system",
                "Android konnte den Schutz nach dem Neustart nicht automatisch starten"
            );
        }
    }
}
