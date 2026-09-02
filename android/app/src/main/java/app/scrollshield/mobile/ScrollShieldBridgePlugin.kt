package app.scrollshield.mobile

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray

/**
 * ScrollShieldBridgePlugin
 * ═══════════════════════════════════════════════════════════════════
 * Capacitor plugin that bridges the React frontend to Android system APIs.
 *
 * Capabilities:
 *  - Permission checks and requests (Usage Stats, Overlay, Notifications)
 *  - Foreground app detection via UsageStatsManager
 *  - Sync of blocked-app list from React state → AppMonitorService
 *  - Start / stop the background AppMonitorService
 *  - Persist blocked-app list in EncryptedSharedPreferences
 *
 * Usage from TypeScript:
 *   import { ScrollShieldBridge } from '@/lib/nativeBridge';
 *   const status = await ScrollShieldBridge.getPermissionStatus();
 */
@CapacitorPlugin(name = "ScrollShieldBridge")
class ScrollShieldBridgePlugin : Plugin() {

    companion object {
        const val PREF_FILE = "scrollshield_native_prefs"
        const val KEY_BLOCKED_PACKAGES = "blocked_packages"
        const val KEY_MONITORING_ENABLED = "monitoring_enabled"
    }

    // ── Encrypted SharedPreferences ───────────────────────────────────────────

    private val encryptedPrefs: SharedPreferences by lazy {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                PREF_FILE,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            // Fallback to plain prefs if security provider is unavailable (emulators)
            context.getSharedPreferences(PREF_FILE, Context.MODE_PRIVATE)
        }
    }

    // ── Permission helpers ────────────────────────────────────────────────────

    /** Returns true if the app has PACKAGE_USAGE_STATS (Usage Access) permission. */
    private fun hasUsageStatsPermission(): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    /** Returns true if SYSTEM_ALERT_WINDOW (overlay) permission is granted. */
    private fun hasOverlayPermission(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)

    // ── Plugin methods (callable from JS/TS) ─────────────────────────────────

    /**
     * Returns the current permission status for all permissions ScrollShield needs.
     *
     * JS call: ScrollShieldBridge.getPermissionStatus()
     * Returns: { usageStats: boolean, overlay: boolean, notifications: boolean }
     */
    @PluginMethod
    fun getPermissionStatus(call: PluginCall) {
        val result = JSObject()
        result.put("usageStats", hasUsageStatsPermission())
        result.put("overlay", hasOverlayPermission())
        result.put("notifications", hasNotificationPermission())
        result.put("monitoringActive", AppMonitorService.isRunning)
        call.resolve(result)
    }

    /**
     * Opens the system Usage Access settings screen so the user can grant permission.
     *
     * JS call: ScrollShieldBridge.requestUsageStatsPermission()
     */
    @PluginMethod
    fun requestUsageStatsPermission(call: PluginCall) {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
            // Deep-link directly to this app's entry when possible (Android 10+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                data = Uri.fromParts("package", context.packageName, null)
            }
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        val result = JSObject()
        result.put("opened", true)
        call.resolve(result)
    }

    /**
     * Opens the system Overlay permission screen.
     *
     * JS call: ScrollShieldBridge.requestOverlayPermission()
     */
    @PluginMethod
    fun requestOverlayPermission(call: PluginCall) {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${context.packageName}")
        ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
        context.startActivity(intent)
        val result = JSObject()
        result.put("opened", true)
        call.resolve(result)
    }

    /**
     * Returns the package name of the currently foregrounded app.
     * Requires PACKAGE_USAGE_STATS permission.
     *
     * JS call: ScrollShieldBridge.getForegroundApp()
     * Returns: { packageName: string | null, hasPermission: boolean }
     */
    @PluginMethod
    fun getForegroundApp(call: PluginCall) {
        val result = JSObject()
        if (!hasUsageStatsPermission()) {
            result.put("hasPermission", false)
            result.put("packageName", null as String?)
            call.resolve(result)
            return
        }

        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()
        val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, now - 10_000L, now)

        val foreground = stats?.maxByOrNull { it.lastTimeUsed }?.packageName

        result.put("hasPermission", true)
        result.put("packageName", foreground)
        call.resolve(result)
    }

    /**
     * Syncs the blocked-app package list from React state to the native layer.
     * The AppMonitorService reads this list to decide when to intervene.
     *
     * JS call: ScrollShieldBridge.syncBlockedApps({ packages: string[], monitoringEnabled: boolean })
     */
    @PluginMethod
    fun syncBlockedApps(call: PluginCall) {
        val packages: JSONArray = call.getArray("packages") ?: JSArray()
        val monitoringEnabled: Boolean = call.getBoolean("monitoringEnabled", false) ?: false

        encryptedPrefs.edit()
            .putString(KEY_BLOCKED_PACKAGES, packages.toString())
            .putBoolean(KEY_MONITORING_ENABLED, monitoringEnabled)
            .apply()

        // Notify a running service of the update without restarting it
        AppMonitorService.notifyConfigUpdate(context)

        val result = JSObject()
        result.put("synced", true)
        result.put("packageCount", packages.length())
        call.resolve(result)
    }

    /**
     * Starts the background AppMonitorService.
     *
     * JS call: ScrollShieldBridge.startMonitoring()
     */
    @PluginMethod
    fun startMonitoring(call: PluginCall) {
        if (!hasUsageStatsPermission()) {
            call.reject("USAGE_STATS_PERMISSION_MISSING", "Grant Usage Access permission first.")
            return
        }
        val intent = Intent(context, AppMonitorService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
        val result = JSObject()
        result.put("started", true)
        call.resolve(result)
    }

    /**
     * Stops the background AppMonitorService.
     *
     * JS call: ScrollShieldBridge.stopMonitoring()
     */
    @PluginMethod
    fun stopMonitoring(call: PluginCall) {
        context.stopService(Intent(context, AppMonitorService::class.java))
        val result = JSObject()
        result.put("stopped", true)
        call.resolve(result)
    }

    // ── Notification permission (Android 13+) ─────────────────────────────────

    private fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
                android.content.pm.PackageManager.PERMISSION_GRANTED
        } else {
            true // Pre-Android 13 doesn't require explicit permission
        }
    }
}
