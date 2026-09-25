package app.scrollshield.mobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Brings the app monitor back after a reboot and after an app update, both of
 * which stop it. Without this the app lock stayed off until ScrollShield was
 * opened again. The accessibility service needs nothing here; Android rebinds
 * it on its own.
 *
 * Both actions are protected broadcasts only the system can send, so the
 * receiver has to be exported. Anything else is ignored.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        when (intent?.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> AppMonitorService.startIfEnabled(context)
        }
    }
}
