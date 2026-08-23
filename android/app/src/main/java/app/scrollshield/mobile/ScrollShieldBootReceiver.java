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
        if (!ScrollShieldNativePlugin.hasConfiguredApps(context)) {
            stopRecovery(
                context,
                "recovery_target_app_missing",
                "Der Android-Schutz wurde nach Neustart oder App-Update nicht gestartet, weil keine aktive installierte Ziel-App verfügbar ist"
            );
            return;
        }
        if (!ScrollShieldNativePlugin.hasUsageAccess(context)) {
            stopRecovery(
                context,
                "recovery_usage_access_missing",
                "Der Android-Schutz wurde nach Neustart oder App-Update nicht gestartet, weil der Nutzungszugriff fehlt"
            );
            return;
        }
        if (!ScrollShieldNativePlugin.hasNotificationsEnabled(context)) {
            stopRecovery(
                context,
                "recovery_notifications_missing",
                "Der Android-Schutz wurde nach Neustart oder App-Update nicht gestartet, weil die sichtbare Schutz-Benachrichtigung nicht verfügbar ist"
            );
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            stopRecovery(
                context,
                "recovery_overlay_missing",
                "Der Android-Schutz wurde nach Neustart oder App-Update nicht gestartet, weil die Overlay-Berechtigung fehlt"
            );
            return;
        }

        Intent serviceIntent = new Intent(context, ScrollShieldProtectionService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (RuntimeException error) {
            stopRecovery(
                context,
                "recovery_start_failed",
                "Android konnte den Schutz nach Neustart oder App-Update nicht automatisch starten"
            );
        }
    }

    private void stopRecovery(Context context, String code, String message) {
        boolean persisted = ScrollShieldNativePlugin.recordProtectionPrerequisiteStop(
            context,
            code,
            message
        );
        if (!persisted) {
            // Best-effort fallback only after the atomic disabled-state + event + diagnostics commit
            // fails. The normal recovery-stop path has no crash window between these writes.
            ScrollShieldNativePlugin.setProtectionEnabled(context, false);
            ScrollShieldNativePlugin.appendProtectionEvent(context, "warning", "system", message);
            ScrollShieldNativePlugin.recordProtectionStop(context, code, message);
        }
    }
}
