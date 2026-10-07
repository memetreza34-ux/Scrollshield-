package app.scrollshield.mobile

import android.app.Activity
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.AdaptiveIconDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.text.TextUtils
import android.util.Base64
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

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
        const val KEY_CONTRACT_VERSION = "protection_contract_version"

        /** Sent to the web layer when the user presses Android's back button. */
        const val EVENT_BACK_BUTTON = "backButton"

        /** Largest tile that shows an app icon (the interruption screen) is 96 dp. */
        const val APP_ICON_SIZE_DP = 96
        const val MAX_APP_ICONS = 32
    }

    // ── Encrypted SharedPreferences ───────────────────────────────────────────

    private val encryptedPrefs: SharedPreferences by lazy { SecurePrefs.open(context) }

    // ── Back button ───────────────────────────────────────────────────────────

    /**
     * The web layer navigates between screens without browser history, so
     * Android's back button closed ScrollShield on every screen. While the web
     * layer listens, back goes to it and it decides: previous screen, or
     * minimizeApp() on the start screen.
     */
    private val backCallback = object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() = onBackButton()
    }

    private fun onBackButton() {
        if (hasListeners(EVENT_BACK_BUTTON)) {
            notifyListeners(EVENT_BACK_BUTTON, JSObject())
            return
        }
        // Nobody listens (page still loading): default behaviour.
        backCallback.isEnabled = false
        activity.onBackPressedDispatcher.onBackPressed()
        backCallback.isEnabled = true
    }

    override fun load() {
        super.load()
        activity.onBackPressedDispatcher.addCallback(activity, backCallback)
    }

    /** Sends ScrollShield to the background, as back on the start screen does in other apps. */
    @PluginMethod
    fun minimizeApp(call: PluginCall) {
        activity.runOnUiThread { activity.moveTaskToBack(true) }
        call.resolve()
    }

    // ── Permission helpers ────────────────────────────────────────────────────

    /** Returns true if the app has PACKAGE_USAGE_STATS (Usage Access) permission. */
    private fun hasUsageStatsPermission(): Boolean = AppMonitorService.hasUsageAccess(context)

    /** Returns true if SYSTEM_ALERT_WINDOW (overlay) permission is granted. */
    private fun hasOverlayPermission(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)

    /**
     * True when the user enabled ScrollShield's accessibility service.
     * `isRunning` is authoritative while the process lives; the settings string
     * covers the window right after boot before the service connected.
     */
    private fun hasAccessibilityService(): Boolean {
        if (ShortVideoWatchService.isRunning) return true

        return try {
            val enabled = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false

            val target = "${context.packageName}/${ShortVideoWatchService::class.java.name}"
            val splitter = TextUtils.SimpleStringSplitter(':')
            splitter.setString(enabled)
            splitter.any { it.equals(target, ignoreCase = true) }
        } catch (_: Exception) {
            false
        }
    }

    /** True when Android exempted ScrollShield from battery optimisation. */
    private fun isIgnoringBatteryOptimizations(): Boolean {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return false
        return powerManager.isIgnoringBatteryOptimizations(context.packageName)
    }

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
        result.put("accessibility", hasAccessibilityService())
        result.put("batteryOptimizationIgnored", isIgnoringBatteryOptimizations())
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
        // Some OEM builds only know the list without the app entry.
        val opened = startSettingsActivity(intent) ||
            startSettingsActivity(
                Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        call.resolve(JSObject().put("opened", opened))
    }

    /**
     * Opens the list of apps exempt from battery optimisation. The one-tap
     * request (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS) needs a permission
     * Google Play only allows for a few kinds of apps, so the user picks
     * ScrollShield in the list; the app's own settings page is the fallback.
     */
    @PluginMethod
    fun openBatteryOptimizationSettings(call: PluginCall) {
        val opened = startSettingsActivity(
            Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ) || startSettingsActivity(
            Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.fromParts("package", context.packageName, null)
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
        call.resolve(JSObject().put("opened", opened))
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
     * The method name is kept for Capacitor compatibility; the payload itself is
     * a versioned protection contract.
     */
    @PluginMethod
    fun syncBlockedApps(call: PluginCall) {
        val contractVersion = call.getInt("contractVersion")
        if (contractVersion == null || !ProtectionContract.isSupported(contractVersion)) {
            call.reject(
                "Unsupported or missing protection contract version.",
                "UNSUPPORTED_PROTECTION_CONTRACT"
            )
            return
        }

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

            val rule = JSONObject()
                .put("packageName", packageName)
                .put("mode", mode)
                .put(
                    "delaySeconds",
                    entry.optInt("delaySeconds", AppMonitorService.DEFAULT_DELAY_SECONDS).coerceIn(0, 300)
                )
            entry.optString("appId").takeIf { it.isNotEmpty() && it.length <= 64 }?.let { rule.put("appId", it) }
            entry.optInt("dailyLimitMinutes", 0).coerceIn(0, 24 * 60).takeIf { it > 0 }?.let {
                rule.put("dailyLimitMinutes", it)
            }
            normalizeAntiBinge(entry.optJSONObject("antiBinge"))?.let { rule.put("antiBinge", it) }
            normalizeTimeWindows(entry.optJSONObject("timeWindows"))?.let { rule.put("timeWindows", it) }
            normalizeShortVideo(entry.optJSONObject("shortVideo"))?.let { rule.put("shortVideo", it) }
            entry.optLong("focusUntil", 0L).takeIf { it > 0L }?.let { rule.put("focusUntil", it) }
            entry.optInt("sessionLimitMinutes", 0).coerceIn(0, 24 * 60).takeIf { it > 0 }?.let {
                rule.put("sessionLimitMinutes", it)
            }
            normalizeEmergencyUnlock(entry.optJSONObject("emergencyUnlock"))?.let { rule.put("emergencyUnlock", it) }
            entry.optLong("emergencyLockedUntil", 0L).takeIf { it > 0L }?.let { rule.put("emergencyLockedUntil", it) }
            normalized.put(rule)
        }

        encryptedPrefs.edit()
            .putInt(KEY_CONTRACT_VERSION, contractVersion)
            .putString(KEY_BLOCKED_RULES, normalized.toString())
            .putBoolean(KEY_MONITORING_ENABLED, monitoringEnabled)
            .apply()

        // Let the running monitor pick the change up without a restart.
        // Research-only accessibility code is not part of the V1 production manifest.
        AppMonitorService.notifyConfigUpdate(context)

        val result = JSObject()
        result.put("synced", true)
        result.put("ruleCount", normalized.length())
        result.put("contractVersion", contractVersion)
        call.resolve(result)
    }

    /**
     * Starts the background AppMonitorService.
     */
    @PluginMethod
    fun startMonitoring(call: PluginCall) {
        if (!hasUsageStatsPermission()) {
            call.reject("Grant Usage Access permission first.", "USAGE_STATS_PERMISSION_MISSING")
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
            call.reject(error.message ?: "Could not start the monitor.", "SERVICE_START_FAILED", error)
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

    /**
     * Opens the system accessibility settings so the user can enable the
     * short-video detection service. Android offers no way to grant this
     * programmatically, by design.
     */
    @PluginMethod
    fun openAccessibilitySettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            .apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
        call.resolve(JSObject().put("opened", startSettingsActivity(intent)))
    }

    /**
     * Returns the short-video usage the accessibility service recorded today.
     * `available` is false when the service is off, so the UI can distinguish
     * "no usage" from "cannot measure".
     */
    @PluginMethod
    fun getShortVideoUsage(call: PluginCall) {
        val result = JSObject()
        val entries = JSArray()

        if (!hasAccessibilityService()) {
            result.put("available", false)
            result.put("entries", entries)
            call.resolve(result)
            return
        }

        val today = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(Date())

        try {
            val raw = encryptedPrefs.getString(ShortVideoWatchService.KEY_SHORT_VIDEO_USAGE, null)
            val stored = if (raw != null) JSONObject(raw) else JSONObject()
            // The service only resets the counters when it next writes, so
            // yesterday's minutes would otherwise be reported as today's.
            val packages = if (stored.optString("date") == today) stored.optJSONObject("packages") else null
            val updatedAt = stored.optLong("updatedAt", 0L)

            if (packages != null) {
                val keys = packages.keys()
                while (keys.hasNext()) {
                    val packageName = keys.next()
                    val millis = packages.optLong(packageName, 0L)
                    entries.put(
                        JSObject()
                            .put("packageName", packageName)
                            .put("surfaceId", surfaceIdFor(packageName))
                            .put("minutesToday", (millis / 60_000L).toInt())
                            .put("swipesInSession", 0)
                            .put("lastSeenAt", updatedAt)
                    )
                }
            }
        } catch (_: Exception) {
            // Fall through with whatever was collected.
        }

        result.put("available", true)
        result.put("date", today)
        result.put("entries", entries)
        call.resolve(result)
    }

    /**
     * Returns the last view-id/class-name samples the accessibility service
     * observed. Used by the in-app calibration screen to check whether a
     * detection signature still matches the installed version of a host app.
     */
    @PluginMethod
    fun getCalibrationSamples(call: PluginCall) {
        val result = JSObject()
        val samples = JSArray()

        if (!hasAccessibilityService()) {
            result.put("available", false)
            result.put("samples", samples)
            call.resolve(result)
            return
        }

        try {
            val raw = encryptedPrefs.getString(ShortVideoWatchService.KEY_CALIBRATION_SAMPLES, "[]") ?: "[]"
            val stored = JSONArray(raw)
            for (index in 0 until stored.length()) {
                stored.optJSONObject(index)?.let { samples.put(it) }
            }
        } catch (_: Exception) {
            // Diagnostics are best effort.
        }

        result.put("available", true)
        result.put("samples", samples)
        call.resolve(result)
    }

    /** Validates the anti-binge thresholds; absent when switched off. */
    private fun normalizeAntiBinge(config: JSONObject?): JSONObject? {
        if (config == null) return null
        val warningThreshold = config.optInt("warningThreshold", 0)
        val blockThreshold = config.optInt("blockThreshold", 0)
        if (warningThreshold !in 1..100 || blockThreshold !in 1..100) return null

        return JSONObject()
            .put("warningThreshold", warningThreshold)
            .put("warningTimeframe", config.optInt("warningTimeframe", 0).coerceIn(1, 24 * 60))
            .put("blockThreshold", blockThreshold)
            .put("blockTimeframe", config.optInt("blockTimeframe", 0).coerceIn(1, 24 * 60))
            .put("escalationSeconds", config.optInt("escalationSeconds", 0).coerceIn(0, 120))
    }

    /** Validates the emergency unlock; absent when switched off. */
    private fun normalizeEmergencyUnlock(config: JSONObject?): JSONObject? {
        if (config == null) return null
        val maxPerDay = config.optInt("maxPerDay", 0)
        if (maxPerDay !in 1..20) return null
        return JSONObject()
            .put("maxPerDay", maxPerDay)
            .put("durationMinutes", config.optInt("durationMinutes", 5).coerceIn(1, 60))
    }

    /**
     * Validates the time-window schedule (see NativeTimeWindows in
     * src/lib/nativeBridge.ts). Only windows that tighten the mode are kept.
     */
    private fun normalizeTimeWindows(schedule: JSONObject?): JSONObject? {
        if (schedule == null) return null

        val windows = JSONArray()
        val source = schedule.optJSONArray("windows") ?: JSONArray()
        for (index in 0 until source.length()) {
            val window = source.optJSONObject(index) ?: continue
            val rule = window.optString("rule")
            val startHour = window.optInt("startHour", -1)
            val endHour = window.optInt("endHour", -1)
            if (rule !in setOf("strict", "block")) continue
            if (startHour !in 0..23 || endHour !in 0..24 || startHour == endHour) continue
            windows.put(
                JSONObject()
                    .put("startHour", startHour)
                    .put("endHour", endHour)
                    .put("rule", rule)
            )
        }

        val weekendRule = schedule.optString("weekendRule").takeIf { it in setOf("strict", "block") } ?: "normal"
        if (windows.length() == 0 && weekendRule == "normal") return null

        return JSONObject()
            .put("windows", windows)
            .put("weekendRule", weekendRule)
    }

    /**
     * Validates the short-video half of a rule. It used to be dropped here
     * entirely, so ShortVideoWatchService never received a single rule.
     */
    private fun normalizeShortVideo(feed: JSONObject?): JSONObject? {
        if (feed == null) return null

        val mode = feed.optString("mode")
        if (mode !in setOf("warn", "limit", "block")) return null

        fun hints(key: String): JSONArray {
            val source = feed.optJSONArray(key) ?: return JSONArray()
            val result = JSONArray()
            for (index in 0 until source.length()) {
                source.optString(index).takeIf { it.isNotEmpty() }?.let { result.put(it) }
            }
            return result
        }

        return JSONObject()
            .put("surfaceId", feed.optString("surfaceId").ifEmpty { "short_video" })
            .put("mode", mode)
            .put("dailyLimitMinutes", feed.optInt("dailyLimitMinutes", 0).coerceIn(0, 24 * 60))
            .put("sessionLimitMinutes", feed.optInt("sessionLimitMinutes", 0).coerceIn(0, 24 * 60))
            .put("stopAfterSwipes", feed.optInt("stopAfterSwipes", 0).coerceIn(0, 10_000))
            .put("hardInterrupt", feed.optBoolean("hardInterrupt", false))
            .put("viewIdHints", hints("viewIdHints"))
            .put("classNameHints", hints("classNameHints"))
            .put("alwaysShortVideo", feed.optBoolean("alwaysShortVideo", false))
    }

    /**
     * Returns how long each protected package was in the foreground today, so
     * the dashboard and the daily limit in the app see real use. Only packages
     * with a rule are looked at.
     */
    @PluginMethod
    fun getAppUsage(call: PluginCall) {
        val result = JSObject()
        val entries = JSArray()

        if (!hasUsageStatsPermission()) {
            result.put("available", false)
            result.put("entries", entries)
            call.resolve(result)
            return
        }

        val packages = mutableSetOf<String>()
        try {
            val rules = JSONArray(encryptedPrefs.getString(KEY_BLOCKED_RULES, "[]") ?: "[]")
            for (index in 0 until rules.length()) {
                rules.optJSONObject(index)?.optString("packageName")?.takeIf { it.isNotEmpty() }?.let(packages::add)
            }
        } catch (_: Exception) {
            // No readable rules, nothing to report.
        }

        for ((packageName, minutes) in ForegroundUsage.minutesToday(context, packages)) {
            entries.put(
                JSObject()
                    .put("packageName", packageName)
                    .put("minutesToday", minutes)
            )
        }

        result.put("available", true)
        result.put("date", SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(Date()))
        result.put("entries", entries)
        call.resolve(result)
    }

    /**
     * Returns today's and yesterday's total screen time in minutes, for the
     * "Heute" tab. Needs Usage Access; only the two sums leave this method.
     */
    @PluginMethod
    fun getScreenTime(call: PluginCall) {
        val result = JSObject()
        if (!hasUsageStatsPermission()) {
            call.resolve(result.put("available", false))
            return
        }

        val now = System.currentTimeMillis()
        val today = ForegroundUsage.startOfToday()
        result.put("available", true)
        result.put("date", SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(Date()))
        result.put("todayMinutes", ForegroundUsage.screenTimeMinutes(context, today, now))
        result.put("yesterdayMinutes", ForegroundUsage.screenTimeMinutes(context, ForegroundUsage.startOfDay(1), today))
        call.resolve(result)
    }

    /**
     * Returns the launcher icons of the requested packages that are installed,
     * as PNG data URLs. ScrollShield ships no third-party logos; Android hands
     * out the icon the user already sees on the home screen. Only packages
     * listed under <queries> in the manifest are visible, the rest are skipped.
     */
    @PluginMethod
    fun getAppIcons(call: PluginCall) {
        val requested = call.getArray("packageNames") ?: JSArray()
        val icons = JSArray()
        val sizePx = (APP_ICON_SIZE_DP * context.resources.displayMetrics.density).toInt()

        for (index in 0 until minOf(requested.length(), MAX_APP_ICONS)) {
            val packageName = requested.optString(index).takeIf { it.isNotEmpty() } ?: continue
            val drawable = try {
                context.packageManager.getApplicationIcon(packageName)
            } catch (_: PackageManager.NameNotFoundException) {
                continue
            }
            icons.put(
                JSObject()
                    .put("packageName", packageName)
                    .put("dataUrl", toPngDataUrl(renderIcon(drawable, sizePx)))
            )
        }

        call.resolve(JSObject().put("icons", icons))
    }

    /**
     * Adaptive icon layers are 108 dp with the visible 72 dp in the middle.
     * Drawing them unmasked at 1.5 times the size gives the full square; the
     * web layer rounds the corners to match its own tiles instead of showing
     * the launcher's circle or squircle.
     */
    private fun renderIcon(drawable: Drawable, sizePx: Int): Bitmap {
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && drawable is AdaptiveIconDrawable) {
            val inset = sizePx / 4
            listOfNotNull(drawable.background, drawable.foreground).forEach { layer ->
                layer.setBounds(-inset, -inset, sizePx + inset, sizePx + inset)
                layer.draw(canvas)
            }
        } else {
            drawable.setBounds(0, 0, sizePx, sizePx)
            drawable.draw(canvas)
        }
        return bitmap
    }

    private fun toPngDataUrl(bitmap: Bitmap): String {
        val bytes = ByteArrayOutputStream().use { stream ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
            stream.toByteArray()
        }
        bitmap.recycle()
        return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    /**
     * Returns the interruptions the overlay recorded and the web layer has not
     * taken over yet. See InterruptionLog.
     */
    @PluginMethod
    fun getInterruptionEvents(call: PluginCall) {
        val events = JSArray()
        val stored = InterruptionLog.read(encryptedPrefs)
        for (index in 0 until stored.length()) {
            stored.optJSONObject(index)?.let { events.put(it) }
        }

        val result = JSObject()
        result.put("events", events)
        call.resolve(result)
    }

    /** Drops the interruptions the web layer has put into its history. */
    @PluginMethod
    fun acknowledgeInterruptionEvents(call: PluginCall) {
        val ids = call.getArray("ids") ?: JSArray()
        val acknowledged = (0 until ids.length())
            .mapNotNull { index -> ids.optString(index).takeIf { it.isNotEmpty() } }
            .toSet()
        InterruptionLog.acknowledge(encryptedPrefs, acknowledged)
        call.resolve()
    }

    /**
     * Deletes everything the native side stored: rules, usage minutes, opening
     * times, interruptions and calibration samples, and stops the monitor.
     * Part of "App zurücksetzen"; before, those stayed on the device.
     */
    @PluginMethod
    fun clearNativeData(call: PluginCall) {
        context.stopService(Intent(context, AppMonitorService::class.java))
        val cleared = try {
            // EncryptedSharedPreferences keeps its own keysets on clear().
            encryptedPrefs.edit().clear().commit()
        } catch (_: Exception) {
            // An unreadable entry makes clear() fail; drop the whole file.
            context.deleteSharedPreferences(PREF_FILE)
        }
        // The accessibility service drops its rules and stops recording.
        AppMonitorService.notifyConfigUpdate(context)
        call.resolve(JSObject().put("cleared", cleared))
    }

    /**
     * Saves a text file where the user chooses, through Android's own "save as"
     * dialog. Used for the data export: the WebView ignores `<a download>`, so
     * the export did nothing in the app. Needs no storage permission.
     */
    @PluginMethod
    fun saveTextFile(call: PluginCall) {
        val filename = call.getString("filename")
        if (filename.isNullOrBlank() || call.getString("content") == null) {
            call.reject("filename and content are required.", "INVALID_FILE")
            return
        }

        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = call.getString("mimeType") ?: "application/json"
            putExtra(Intent.EXTRA_TITLE, filename)
        }
        startActivityForResult(call, intent, "saveTextFileResult")
    }

    @Suppress("unused") // Called by Capacitor through reflection.
    @ActivityCallback
    private fun saveTextFileResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val uri = result.data?.data
        if (result.resultCode != Activity.RESULT_OK || uri == null) {
            call.resolve(JSObject().put("saved", false))
            return
        }

        try {
            val stream = context.contentResolver.openOutputStream(uri, "wt")
                ?: throw IllegalStateException("No output stream for the chosen file.")
            stream.use { it.write((call.getString("content") ?: "").toByteArray(Charsets.UTF_8)) }
            call.resolve(JSObject().put("saved", true))
        } catch (error: Exception) {
            call.reject(error.message ?: "Could not save the file.", "SAVE_FAILED", error)
        }
    }

    /** Looks the configured surface id for a package up in the stored rules. */
    private fun surfaceIdFor(packageName: String): String {
        return try {
            val raw = encryptedPrefs.getString(KEY_BLOCKED_RULES, "[]") ?: "[]"
            val rules = JSONArray(raw)
            for (index in 0 until rules.length()) {
                val entry = rules.optJSONObject(index) ?: continue
                if (entry.optString("packageName") == packageName) {
                    return entry.optJSONObject("shortVideo")?.optString("surfaceId") ?: "short_video"
                }
            }
            "short_video"
        } catch (_: Exception) {
            "short_video"
        }
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
