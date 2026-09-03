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
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray
import org.json.JSONObject

/**
 * ScrollShieldBridgePlugin
 * ═══════════════════════════════════════════════════════════════════
 * Capacitor plugin that bridges the React frontend to Android system APIs.
 *
 * Capabilities:
 *  - Permission checks and requests (Usage Stats, Overlay, Notifications)
 *  - Foreground app detection via UsageStatsManager
 *  - Sync of per-app protection rules from React state → AppMonitorService
 *  - Start / stop the background AppMonitorService
 *  - Persist the rule set in EncryptedSharedPreferences
 *
 * Usage from TypeScript:
 *   import { ScrollShieldBridge } from '@/lib/nativeBridge';
 *   const status = await ScrollShieldBridge.getPermissionStatus();
 */
@CapacitorPlugin(name = "ScrollShieldBridge")
class ScrollShieldBridgePlugin : Plugin() {

    companion object {
        const val PREF_FILE = "scrollshield_native_prefs"

        /** JSON array of { packageName, mode, delaySeconds } objects. */
        const val KEY_BLOCKED_RULES = "blocked_rules"
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
        } catch (_: Exception) {
            // Fallback to plain prefs if the security provider is unavailable (emulators)
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

    private fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
                android.content.pm.PackageManager.PERMISSION_GRANTED
        } else {
            true // Pre-Android 13 doesn't require explicit permission
        }
    }

    // ── Plugin methods (callable from JS/TS) ─────────────────────────────────

    /**
     * Returns the current permission status for everything ScrollShield needs.
     *
     * JS call: ScrollShieldBridge.getPermissionStatus()
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
        call.resolve(JSObject().put("opened", startSettingsActivity(intent)))
    }

    /**
     * Opens the system Overlay permission screen.
     */
    @PluginMethod
    fun requestOverlayPermission(call: PluginCall) {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${context.packageName}")
        ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
        call.resolve(JSObject().put("opened", startSettingsActivity(intent)))
    }

    /**
     * Returns the package name of the app that most recently came to the foreground.
     * Requires PACKAGE_USAGE_STATS permission.
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

        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()
        val stats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, now - 60_000L, now)
        val foreground = stats?.maxByOrNull { it.lastTimeUsed }?.packageName

        result.put("hasPermission", true)
        result.put("packageName", foreground)
        call.resolve(result)
    }

    /**
     * Syncs the per-app protection rules from React state to the native layer.
     * The AppMonitorService reads them to decide how to intervene.
     *
     * JS call: ScrollShieldBridge.syncBlockedApps({
     *   rules: [{ packageName, mode, delaySeconds }],
     *   monitoringEnabled: boolean,
     * })
     */
    @PluginMethod
    fun syncBlockedApps(call: PluginCall) {
        val incoming = call.getArray("rules") ?: JSONArray()
        val monitoringEnabled = call.getBoolean("monitoringEnabled", false) ?: false

        val normalized = JSONArray()
        for (index in 0 until incoming.length()) {
            val entry = incoming.optJSONObject(index) ?: continue
            val packageName = entry.optString("packageName")
            if (packageName.isEmpty()) continue

            val mode = when (val rawMode = entry.optString("mode", "standard")) {
                "soft", "standard", "strict" -> rawMode
                else -> "standard"
            }

            normalized.put(
                JSONObject()
                    .put("packageName", packageName)
                    .put("mode", mode)
                    .put(
                        "delaySeconds",
                        entry.optInt("delaySeconds", AppMonitorService.DEFAULT_DELAY_SECONDS).coerceIn(0, 300)
                    )
            )
        }

        encryptedPrefs.edit()
            .putString(KEY_BLOCKED_RULES, normalized.toString())
            .putBoolean(KEY_MONITORING_ENABLED, monitoringEnabled)
            .apply()

        // Let a running service pick the change up without a restart.
        if (AppMonitorService.isRunning) {
            AppMonitorService.notifyConfigUpdate(context)
        }

        val result = JSObject()
        result.put("synced", true)
        result.put("ruleCount", normalized.length())
        call.resolve(result)
    }

    /**
     * Starts the background AppMonitorService.
     */
    @PluginMethod
    fun startMonitoring(call: PluginCall) {
        if (!hasUsageStatsPermission()) {
            call.reject("USAGE_STATS_PERMISSION_MISSING", "Grant Usage Access permission first.")
            return
        }

        val intent = Intent(context, AppMonitorService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } catch (error: Exception) {
            call.reject("SERVICE_START_FAILED", error.message, error)
            return
        }

        val result = JSObject()
        result.put("started", true)
        // Without the overlay permission the service runs but cannot interrupt anything.
        result.put("overlayGranted", hasOverlayPermission())
        call.resolve(result)
    }

    /**
     * Stops the background AppMonitorService.
     */
    @PluginMethod
    fun stopMonitoring(call: PluginCall) {
        encryptedPrefs.edit().putBoolean(KEY_MONITORING_ENABLED, false).apply()
        context.stopService(Intent(context, AppMonitorService::class.java))
        call.resolve(JSObject().put("stopped", true))
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun startSettingsActivity(intent: Intent): Boolean {
        return try {
            context.startActivity(intent)
            true
        } catch (_: Exception) {
            // Some OEM builds ship without these settings screens.
            false
        }
    }
}
