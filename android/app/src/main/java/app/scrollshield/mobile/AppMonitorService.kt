package app.scrollshield.mobile

import android.app.AppOpsManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.Process
import android.os.SystemClock
import android.provider.Settings
import android.text.format.DateFormat
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.Date
import java.util.concurrent.ConcurrentHashMap

/**
 * AppMonitorService
 * ════════════════════════════════════════════════════════════════════
 * Foreground service that detects app switches through UsageStatsManager
 * events and shows a SYSTEM_ALERT_WINDOW interruption screen for apps the
 * user has protected.
 *
 * The behaviour per app comes from the rules the web layer syncs down
 * (see ScrollShieldBridgePlugin.syncBlockedApps):
 *  - soft     → reminder that can be dismissed right away
 *  - standard → countdown of the app's own openDelay, then "continue" unlocks;
 *               every reopen inside the anti-binge window makes it longer
 *  - strict   → no continue button; only "back"
 *
 * On top of that: locks by daily budget, cooldown, schedule and focus (each
 * with an emergency unlock when the rule allows one), and the session guard,
 * which interrupts after a set time in the app without a break.
 *
 * Known limits (documented in docs/NATIVE_ANDROID.md):
 *  - Detection is event based and lags an app switch by up to POLL_INTERVAL_MS.
 *  - The overlay cannot prevent the user from leaving via gestures; it
 *    reappears the next time the protected app comes to the foreground.
 *  - Daily budget, cooldown, schedules and focus are evaluated when a
 *    protected app comes to the front (see evaluate()); only the session
 *    guard is checked while the app stays open.
 *
 * Lifecycle:
 *  - Started by ScrollShieldBridgePlugin.startMonitoring()
 *  - Stopped  by ScrollShieldBridgePlugin.stopMonitoring()
 *  - Rules are refreshed through an ACTION_CONFIG_UPDATE start intent
 */
class AppMonitorService : Service() {

    companion object {
        const val CHANNEL_ID = "scrollshield_monitor"
        const val NOTIF_ID = 1001
        const val ACTION_CONFIG_UPDATE = "app.scrollshield.ACTION_CONFIG_UPDATE"

        /** How often the usage event stream is inspected. */
        const val POLL_INTERVAL_MS = 1500L

        /** Window of usage events queried on every poll. */
        const val EVENT_LOOKBACK_MS = 15_000L

        /** Fallback delay when a rule carries no explicit openDelay. */
        const val DEFAULT_DELAY_SECONDS = 5

        /** Longest pause the reopen protection builds up (MAX_ESCALATED_DELAY_SECONDS in protectionRules.ts). */
        const val MAX_ESCALATED_DELAY_SECONDS = 120

        /** Waiting time before an emergency unlock takes effect. */
        const val EMERGENCY_WAIT_SECONDS = 10

        /** Sent by ShortVideoWatchService when a feed limit is reached. */
        const val ACTION_SHORT_VIDEO_INTERRUPT = "app.scrollshield.ACTION_SHORT_VIDEO_INTERRUPT"
        const val EXTRA_PACKAGE_NAME = "packageName"
        const val EXTRA_SURFACE_ID = "surfaceId"
        const val EXTRA_REASON = "reason"
        const val EXTRA_HARD_INTERRUPT = "hardInterrupt"
        const val EXTRA_SWIPES = "swipes"

        /** True while the service is running – read by the plugin to expose state to JS. */
        @Volatile
        var isRunning = false
            private set

        /**
         * Asks the running services to reload their rules: the monitor through a
         * start intent, the accessibility service through a broadcast it
         * registered for at runtime. The two run independently – the
         * accessibility service may be enabled while the monitor is off – so
         * the broadcast goes out either way.
         */
        fun notifyConfigUpdate(context: Context) {
            // A start intent would launch a stopped monitor; it loads its rules
            // on start anyway.
            if (isRunning) {
                val intent = Intent(context, AppMonitorService::class.java).setAction(ACTION_CONFIG_UPDATE)
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }
                } catch (_: Exception) {
                    // Start not allowed from background – rules are loaded again
                    // the next time monitoring starts.
                }
            }

            try {
                context.sendBroadcast(
                    Intent(ACTION_CONFIG_UPDATE).setPackage(context.packageName)
                )
            } catch (_: Exception) {
                // Accessibility service not enabled.
            }
        }

        /** True when the user granted Usage Access; without it the monitor sees nothing. */
        fun hasUsageAccess(context: Context): Boolean {
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

        /**
         * Starts the monitor if the user had it running: monitoring switched on,
         * at least one rule, Usage Access granted. Used after a reboot or an
         * update, when nothing else would start it.
         */
        fun startIfEnabled(context: Context) {
            val prefs = SecurePrefs.open(context)
            if (!prefs.getBoolean(ScrollShieldBridgePlugin.KEY_MONITORING_ENABLED, false)) return
            val contractVersion = prefs.getInt(ScrollShieldBridgePlugin.KEY_CONTRACT_VERSION, 0)
            if (contractVersion != 0 && !ProtectionContract.isSupported(contractVersion)) return
            val rules = prefs.getString(ScrollShieldBridgePlugin.KEY_BLOCKED_RULES, "[]") ?: "[]"
            if (rules.isBlank() || rules.trim() == "[]") return
            if (!hasUsageAccess(context)) return

            val intent = Intent(context, AppMonitorService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (_: Exception) {
                // Start refused; the app starts the monitor again when opened.
            }
        }
    }

    private data class AntiBinge(
        val warningThreshold: Int,
        val warningTimeframe: Int,
        val blockThreshold: Int,
        val blockTimeframe: Int,
        /** Seconds the pause grows with every opening inside warningTimeframe. */
        val escalationSeconds: Int = 0,
    )

    private data class EmergencyUnlock(val maxPerDay: Int, val durationMinutes: Int)

    private data class BlockRule(
        val mode: String,
        val delaySeconds: Int,
        /** Platform id; packages of one app (main and lite build) share limits. */
        val appId: String = "",
        val timeWindows: List<HourWindow> = emptyList(),
        val weekendRule: String = "normal",
        /** Minutes per day across all packages of the app; 0 = no limit. */
        val dailyLimitMinutes: Int = 0,
        val antiBinge: AntiBinge? = null,
        /** Locked by a focus or rescue session until this time; 0 = none. */
        val focusUntil: Long = 0L,
        /** Session guard: interrupt after this many minutes without a break; 0 = off. */
        val sessionLimitMinutes: Int = 0,
        val emergencyUnlock: EmergencyUnlock? = null,
        /** No emergency unlock before this time (self-commitment, strict focus). */
        val emergencyLockedUntil: Long = 0L,
    )

    /**
     * What happens when a protected app comes to the front. `lockReason` set:
     * the app is locked and `statusText` says why. Otherwise the rule's normal
     * interruption runs; a reopen brings its own text and a longer pause.
     */
    private data class Verdict(
        val lockReason: String? = null,
        val statusText: String? = null,
        val reopenText: String? = null,
        val delaySeconds: Int? = null,
    )

    /** The parts of the overlay its callers drive. */
    private class OverlayViews(
        val status: TextView,
        val countdown: TextView,
        val continueButton: Button,
        val emergencyButton: Button,
    )

    // ── State ─────────────────────────────────────────────────────────────────

    private val mainHandler = Handler(Looper.getMainLooper())
    private lateinit var workerThread: HandlerThread
    private lateinit var workerHandler: Handler

    private var windowManager: WindowManager? = null

    /** Set on the main thread, also read by the poll worker. */
    @Volatile
    private var overlayView: View? = null

    @Volatile
    private var overlayPackage: String? = null

    @Volatile
    private var rules: Map<String, BlockRule> = emptyMap()

    @Volatile
    private var monitoringEnabled = false

    /** Updated with every rule parse; expired signed Pro must fall back to Free. */
    @Volatile
    private var signedProRulesActive = false

    @Volatile
    private var lastForegroundPackage: String? = null
    /** Emergency unlocks per app id: until then the app is completely free. */
    private val emergencyUntil = ConcurrentHashMap<String, Long>()

    /** Monotonic elapsedRealtime() start of the current session, per protected package. */
    private val sessionStartedAt = ConcurrentHashMap<String, Long>()

    private val colorBackground = Color.parseColor("#F70A0A0A")
    private val colorText = Color.parseColor("#FAFAFA")
    private val colorBody = Color.parseColor("#D4D4D8")
    private val colorMuted = Color.parseColor("#A1A1AA")
    private val colorAccent = Color.parseColor("#10B981")
    private val colorOnAccent = Color.parseColor("#052E1F")

    private val prefs: SharedPreferences by lazy { SecurePrefs.open(this) }
    private val openLog: OpenLog by lazy { OpenLog(prefs) }

    // ── Polling runnable ──────────────────────────────────────────────────────

    private val pollRunnable = object : Runnable {
        override fun run() {
            try {
                checkForegroundApp()
            } catch (_: Exception) {
                // A single failed poll must never take the service down.
            }
            workerHandler.postDelayed(this, POLL_INTERVAL_MS)
        }
    }

    // ── Service lifecycle ─────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        workerThread = HandlerThread("scrollshield-monitor").apply { start() }
        workerHandler = Handler(workerThread.looper)

        startInForeground()
        loadRules()
        if (!hasActiveRules()) {
            stopSelf()
            return
        }
        workerHandler.post(pollRunnable)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // A restart by the system delivers a null intent; make sure the
        // notification is up before anything else happens.
        startInForeground()

        when (intent?.action) {
            ACTION_CONFIG_UPDATE -> {
                loadRules()
                if (!hasActiveRules()) {
                    stopSelf()
                    return START_NOT_STICKY
                }
            }

            ACTION_SHORT_VIDEO_INTERRUPT -> {
                val packageName = intent.getStringExtra(EXTRA_PACKAGE_NAME)
                if (packageName != null) {
                    showShortVideoOverlay(
                        packageName = packageName,
                        reason = intent.getStringExtra(EXTRA_REASON) ?: "SWIPES",
                        hardInterrupt = intent.getBooleanExtra(EXTRA_HARD_INTERRUPT, false),
                        swipes = intent.getIntExtra(EXTRA_SWIPES, 0),
                    )
                }
            }
        }

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        workerHandler.removeCallbacks(pollRunnable)
        workerThread.quitSafely()
        dismissOverlay()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startInForeground() {
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 14+ rejects a foreground service that does not declare its type here.
            startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIF_ID, notification)
        }
    }

    // ── Rules ─────────────────────────────────────────────────────────────────

    private fun hasActiveRules(): Boolean = monitoringEnabled && rules.isNotEmpty()

    private fun loadRules() {
        monitoringEnabled = prefs.getBoolean(ScrollShieldBridgePlugin.KEY_MONITORING_ENABLED, false)

        // Version 0 is the pre-contract legacy format. It remains readable so
        // existing local installs are not silently reset. Every new sync writes v1.
        val contractVersion = prefs.getInt(ScrollShieldBridgePlugin.KEY_CONTRACT_VERSION, 0)
        if (contractVersion != 0 && !ProtectionContract.isSupported(contractVersion)) {
            monitoringEnabled = false
            dismissOverlay()
            return
        }

        val raw = prefs.getString(ScrollShieldBridgePlugin.KEY_BLOCKED_RULES, "[]") ?: "[]"
        val parsed = mutableMapOf<String, BlockRule>()
        try {
            val signedPro = NativeProEntitlement.isActive(prefs, BuildConfig.SCROLLSHIELD_ENTITLEMENT_SPKI, NativeBillingIdentity.currentUid(this))
            val array = NativeFreeRules.project(JSONArray(raw), signedPro)
            signedProRulesActive = signedPro
            for (index in 0 until array.length()) {
                val entry = array.optJSONObject(index)
                if (entry != null) {
                    val packageName = entry.optString("packageName")
                    if (packageName.isNotEmpty()) {
                        val schedule = entry.optJSONObject("timeWindows")
                        parsed[packageName] = BlockRule(
                            mode = entry.optString("mode", "standard"),
                            delaySeconds = entry.optInt("delaySeconds", DEFAULT_DELAY_SECONDS),
                            appId = entry.optString("appId").ifEmpty { packageName },
                            timeWindows = parseTimeWindows(schedule),
                            weekendRule = schedule?.optString("weekendRule", "normal") ?: "normal",
                            dailyLimitMinutes = entry.optInt("dailyLimitMinutes", 0),
                            antiBinge = parseAntiBinge(entry.optJSONObject("antiBinge")),
                            focusUntil = entry.optLong("focusUntil", 0L),
                            sessionLimitMinutes = entry.optInt("sessionLimitMinutes", 0),
                            emergencyUnlock = parseEmergencyUnlock(entry.optJSONObject("emergencyUnlock")),
                            emergencyLockedUntil = entry.optLong("emergencyLockedUntil", 0L),
                        )
                    }
                } else {
                    // Backwards compatible with the previous plain package-name list.
                    val packageName = array.optString(index)
                    if (packageName.isNotEmpty()) {
                        parsed[packageName] = BlockRule("standard", DEFAULT_DELAY_SECONDS, appId = packageName)
                    }
                }
            }
        } catch (_: Exception) {
            // Never retain previously loaded paid rules when the saved data
            // becomes unreadable at the exact time a signed grant expires.
            rules = emptyMap()
            signedProRulesActive = false
            lastForegroundPackage = null
            sessionStartedAt.clear()
            dismissOverlay()
            return
        }

        rules = parsed
        if (!monitoringEnabled || parsed.isEmpty()) {
            dismissOverlay()
        }
    }

    private fun parseAntiBinge(config: JSONObject?): AntiBinge? {
        if (config == null) return null
        return AntiBinge(
            warningThreshold = config.optInt("warningThreshold"),
            warningTimeframe = config.optInt("warningTimeframe"),
            blockThreshold = config.optInt("blockThreshold"),
            blockTimeframe = config.optInt("blockTimeframe"),
            escalationSeconds = config.optInt("escalationSeconds", 0),
        ).takeIf { it.warningThreshold > 0 && it.blockThreshold > 0 }
    }

    private fun parseEmergencyUnlock(config: JSONObject?): EmergencyUnlock? {
        if (config == null) return null
        return EmergencyUnlock(
            maxPerDay = config.optInt("maxPerDay", 0),
            durationMinutes = config.optInt("durationMinutes", 5),
        ).takeIf { it.maxPerDay > 0 && it.durationMinutes > 0 }
    }

    private fun parseTimeWindows(schedule: JSONObject?): List<HourWindow> {
        val windows = schedule?.optJSONArray("windows") ?: return emptyList()
        return (0 until windows.length()).mapNotNull { index ->
            val window = windows.optJSONObject(index) ?: return@mapNotNull null
            HourWindow(window.optInt("startHour", -1), window.optInt("endHour", -1))
        }
    }

    /**
     * Mirrors getActiveScheduleForApp() in src/lib/schedules.ts: a schedule
     * covering the current hour, or on a weekend a weekend rule, locks the app.
     */
    private fun isLockedByTimeWindow(rule: BlockRule, now: Calendar = Calendar.getInstance()): Boolean =
        NativeRuntimePolicy.isScheduleLocked(
            hour = now.get(Calendar.HOUR_OF_DAY),
            dayOfWeek = now.get(Calendar.DAY_OF_WEEK),
            windows = rule.timeWindows,
            weekendRule = rule.weekendRule,
        )

    // ── Core logic ────────────────────────────────────────────────────────────

    private fun checkForegroundApp() {
        if (!monitoringEnabled || rules.isEmpty()) return

        // This service already runs in the foreground for actual protection.
        // Renew signed paid access only when the user is signed in; the network
        // and Play calls are asynchronous and throttled independently.
        NativePlayRefreshCoordinator.maybeRefresh(this)

        // The entitlement can expire while the user stays inside a protected
        // app. Reproject from stored rules immediately, without waiting for JS.
        val signedProNow = NativeProEntitlement.isActive(prefs, BuildConfig.SCROLLSHIELD_ENTITLEMENT_SPKI, NativeBillingIdentity.currentUid(this))
        if (signedProNow != signedProRulesActive) {
            loadRules()
            lastForegroundPackage = null
            sessionStartedAt.clear()
            dismissOverlay()
        }

        // With the screen off nobody is using an app: no session runs.
        if (!isScreenInteractive()) {
            sessionStartedAt.clear()
            return
        }

        // The event stream only reports switches. While an app stays in front
        // there may be no new event for minutes; then the last switch holds.
        val foreground = queryForegroundPackage() ?: lastForegroundPackage ?: return
        val now = System.currentTimeMillis()

        if (foreground == packageName) {
            dismissOverlay()
            lastForegroundPackage = foreground
            return
        }

        // Leaving the protected app takes the overlay with it.
        if (overlayPackage != null && overlayPackage != foreground) {
            dismissOverlay()
        }

        if (foreground == lastForegroundPackage) {
            checkSessionLimit(foreground, SystemClock.elapsedRealtime())
            return
        }
        lastForegroundPackage = foreground

        val rule = rules[foreground] ?: return
        sessionStartedAt[foreground] = SystemClock.elapsedRealtime()

        // An emergency unlock frees the app completely for its duration.
        if (now < (emergencyUntil[rule.appId] ?: 0L)) {
            openLog.record(rule.appId, now)
            return
        }

        val verdict = evaluate(foreground, rule, now)

        // A genuine package transition back into the app is always evaluated.
        // Staying inside the same app is already suppressed by lastForegroundPackage,
        // so a multi-minute grace period would incorrectly bypass Reopen Protection.
        showInterruptionOverlay(foreground, rule, verdict)
    }

    /** The session guard: interrupts after the rule's minutes in the app without a break. */
    private fun checkSessionLimit(packageName: String, now: Long) {
        val rule = rules[packageName] ?: return
        if (rule.sessionLimitMinutes <= 0 || overlayView != null) return
        // Emergency expiry is persisted as wall-clock epoch millis; session duration
        // uses elapsedRealtime(). Mixing clocks can suppress Session Guard forever.
        if (NativeRuntimePolicy.isEmergencyUnlockActive(emergencyUntil[rule.appId], System.currentTimeMillis())) return

        val startedAt = sessionStartedAt[packageName]
        if (startedAt == null) {
            sessionStartedAt[packageName] = now
            return
        }
        if (!NativeRuntimePolicy.shouldInterruptSession(startedAt, now, rule.sessionLimitMinutes)) return

        sessionStartedAt[packageName] = now
        showSessionOverlay(packageName, rule)
    }

    private fun isScreenInteractive(): Boolean =
        (getSystemService(POWER_SERVICE) as? PowerManager)?.isInteractive ?: true

    /**
     * Mirrors evaluateProtectionAttempt() in src/lib/protectionRules.ts, in the
     * same order: daily budget, cooldown, schedule, focus, strict mode, then
     * the reopen protection in front of the normal pause.
     */
    private fun evaluate(packageName: String, rule: BlockRule, now: Long): Verdict {
        val appName = getAppName(packageName)

        if (rule.dailyLimitMinutes > 0) {
            val packages = rules.filterValues { it.appId == rule.appId }.keys
            val usedMinutes = ForegroundUsage.minutesToday(this, packages).values.sum()
            if (usedMinutes >= rule.dailyLimitMinutes) {
                return Verdict(
                    lockReason = "DAILY_LIMIT",
                    statusText = getString(R.string.overlay_daily_limit_hint, usedMinutes, rule.dailyLimitMinutes, appName),
                )
            }
        }

        val reopenDecision = rule.antiBinge?.let { antiBinge ->
            ReopenPolicy.decide(
                warningOpenCount = openLog.count(rule.appId, now, antiBinge.warningTimeframe),
                blockOpenCount = openLog.count(rule.appId, now, antiBinge.blockTimeframe),
                warningThreshold = antiBinge.warningThreshold,
                blockThreshold = antiBinge.blockThreshold,
                baseDelaySeconds = rule.delaySeconds,
                escalationSeconds = antiBinge.escalationSeconds,
                maxDelaySeconds = MAX_ESCALATED_DELAY_SECONDS,
            )
        }

        if (reopenDecision?.blocked == true) {
            val opens = rule.antiBinge?.let { openLog.count(rule.appId, now, it.blockTimeframe) } ?: 0
            return Verdict(
                lockReason = "ANTI_BINGE",
                statusText = getString(
                    R.string.overlay_anti_binge_block_hint,
                    opens,
                    rule.antiBinge?.blockTimeframe ?: 0,
                ),
            )
        }

        if (isLockedByTimeWindow(rule)) {
            return Verdict(lockReason = "TIME_WINDOW", statusText = getString(R.string.overlay_time_window_hint, appName))
        }

        if (now < rule.focusUntil) {
            return Verdict(
                lockReason = "FOCUS",
                statusText = getString(R.string.overlay_focus_hint, formatTime(rule.focusUntil), appName),
            )
        }

        if (rule.mode == "strict") {
            return Verdict(lockReason = "STRICT", statusText = getString(R.string.overlay_strict_hint, appName))
        }

        if (reopenDecision?.warning == true) {
            return Verdict(
                reopenText = getString(R.string.overlay_reopen_body, appName),
                delaySeconds = reopenDecision.delaySeconds,
            )
        }

        return Verdict()
    }

    private fun formatTime(millis: Long): String = DateFormat.getTimeFormat(this).format(Date(millis))

    /**
     * Returns the package of the most recent foreground transition.
     * Uses the event stream instead of aggregated usage stats, which only
     * reports daily buckets and lags behind real app switches.
     */
    private fun queryForegroundPackage(): String? {
        val usageStatsManager = getSystemService(USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
        val now = System.currentTimeMillis()
        val events = usageStatsManager.queryEvents(now - EVENT_LOOKBACK_MS, now) ?: return null

        val event = UsageEvents.Event()
        var latestPackage: String? = null
        var latestTimestamp = 0L

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val isForegroundEvent = event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
                (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && event.eventType == UsageEvents.Event.ACTIVITY_RESUMED)
            if (isForegroundEvent && event.timeStamp >= latestTimestamp) {
                latestTimestamp = event.timeStamp
                latestPackage = event.packageName
            }
        }

        return latestPackage
    }

    // ── Overlay ───────────────────────────────────────────────────────────────

    private fun showInterruptionOverlay(blockedPackage: String, rule: BlockRule, verdict: Verdict) {
        val appName = getAppName(blockedPackage)
        val locked = verdict.lockReason != null
        val reopened = verdict.reopenText != null
        val reason = verdict.lockReason ?: when {
            reopened -> "ANTI_BINGE_WARNING"
            rule.mode == "soft" -> "SOFT"
            else -> "STANDARD"
        }
        presentOverlay(
            blockedPackage = blockedPackage,
            bodyText = verdict.statusText ?: verdict.reopenText ?: getString(R.string.overlay_body, appName),
            continueText = getString(R.string.overlay_continue_to, appName),
            showContinue = !locked,
            onShown = {
                // A lock and a reopen count the moment they are shown, as in
                // the in-app flow; a plain pause only once the user decides.
                when {
                    locked -> recordInterruption(blockedPackage, InterruptionLog.KIND_APP, InterruptionLog.OUTCOME_BLOCKED, reason)
                    reopened -> recordInterruption(blockedPackage, InterruptionLog.KIND_APP, InterruptionLog.OUTCOME_WARNED, reason)
                    else -> Unit
                }
            },
            onContinue = {
                val now = System.currentTimeMillis()
                recordInterruption(blockedPackage, InterruptionLog.KIND_APP, InterruptionLog.OUTCOME_CONTINUED, reason)
                openLog.record(rule.appId, now)
                sessionStartedAt[blockedPackage] = SystemClock.elapsedRealtime()
                dismissOverlay()
            },
            onGoHome = {
                // Already counted when a lock or a reopen was shown.
                if (!locked && !reopened) {
                    recordInterruption(blockedPackage, InterruptionLog.KIND_APP, InterruptionLog.OUTCOME_STOPPED, reason)
                }
            },
        ) { views ->
            if (locked) {
                offerEmergencyUnlock(views, blockedPackage, rule, appName)
            } else {
                val seconds = if (rule.mode == "soft") 0 else (verdict.delaySeconds ?: rule.delaySeconds)
                startCountdown(views, seconds.coerceAtLeast(0))
            }
        }
    }

    /** The session guard's interruption: the same pause, then go on or stop. */
    private fun showSessionOverlay(packageName: String, rule: BlockRule) {
        val appName = getAppName(packageName)
        presentOverlay(
            blockedPackage = packageName,
            bodyText = getString(R.string.overlay_session_body, rule.sessionLimitMinutes, appName),
            continueText = getString(R.string.overlay_continue),
            showContinue = true,
            onShown = {
                recordInterruption(packageName, InterruptionLog.KIND_APP, InterruptionLog.OUTCOME_WARNED, "SESSION_LIMIT")
            },
            onContinue = {
                sessionStartedAt[packageName] = SystemClock.elapsedRealtime()
                dismissOverlay()
            },
        ) { views ->
            startCountdown(views, rule.delaySeconds.coerceAtLeast(0))
        }
    }

    /**
     * Offers an emergency unlock on a lock screen when the rule allows one,
     * none is blocked by a self-commitment or strict focus, and today's
     * maximum is not used up. After a wait the app is free for the rule's
     * minutes.
     */
    private fun offerEmergencyUnlock(views: OverlayViews, packageName: String, rule: BlockRule, appName: String) {
        val unlock = rule.emergencyUnlock ?: return
        if (System.currentTimeMillis() < rule.emergencyLockedUntil) return
        val remaining = unlock.maxPerDay - EmergencyLog.countToday(prefs, rule.appId)
        if (remaining <= 0) return

        views.emergencyButton.text = getString(R.string.overlay_emergency, remaining)
        views.emergencyButton.visibility = View.VISIBLE
        views.emergencyButton.setOnClickListener {
            views.emergencyButton.visibility = View.GONE
            val owner = overlayView
            var wait = EMERGENCY_WAIT_SECONDS
            val tick = object : Runnable {
                override fun run() {
                    if (overlayView == null || overlayView !== owner) return
                    if (wait <= 0) {
                        views.status.text = ""
                        views.continueButton.text =
                            getString(R.string.overlay_emergency_confirm, appName, unlock.durationMinutes)
                        views.continueButton.visibility = View.VISIBLE
                        setButtonEnabled(views.continueButton, true)
                        views.continueButton.setOnClickListener {
                            val now = System.currentTimeMillis()
                            EmergencyLog.record(prefs, rule.appId)
                            emergencyUntil[rule.appId] = now + unlock.durationMinutes * 60_000L
                            sessionStartedAt[packageName] = SystemClock.elapsedRealtime()
                            recordInterruption(
                                packageName,
                                InterruptionLog.KIND_APP,
                                InterruptionLog.OUTCOME_EMERGENCY,
                                "EMERGENCY",
                            )
                            dismissOverlay()
                        }
                        return
                    }
                    views.status.text = resources.getQuantityString(R.plurals.overlay_emergency_wait, wait, wait)
                    wait--
                    mainHandler.postDelayed(this, 1000L)
                }
            }
            mainHandler.post(tick)
        }
    }

    /**
     * Interruption raised by ShortVideoWatchService when a feed limit is hit.
     * A hard interrupt offers no way back into the feed; a soft one lets the
     * user continue after acknowledging the number.
     */
    private fun showShortVideoOverlay(
        packageName: String,
        reason: String,
        hardInterrupt: Boolean,
        swipes: Int,
    ) {
        val appName = getAppName(packageName)
        val body = when (reason) {
            "DAILY_LIMIT" -> getString(R.string.overlay_feed_daily_limit, appName)
            "SESSION_LIMIT" -> getString(R.string.overlay_feed_session_limit, appName)
            "BLOCKED" -> getString(R.string.overlay_feed_blocked, appName)
            else -> resources.getQuantityString(R.plurals.overlay_feed_swipes, swipes, swipes, appName)
        }

        presentOverlay(
            blockedPackage = packageName,
            bodyText = body,
            continueText = getString(R.string.overlay_continue),
            showContinue = !hardInterrupt,
            onShown = {
                recordInterruption(
                    packageName,
                    InterruptionLog.KIND_SHORT_VIDEO,
                    if (hardInterrupt) InterruptionLog.OUTCOME_BLOCKED else InterruptionLog.OUTCOME_WARNED,
                    reason,
                    swipes,
                )
            },
            onContinue = {
                // The feed itself stays protected; this only dismisses the screen.
                dismissOverlay()
            },
        ) { views ->
            views.status.text = if (hardInterrupt) {
                getString(R.string.overlay_feed_hard_hint)
            } else {
                getString(R.string.overlay_feed_soft_hint)
            }
            setButtonEnabled(views.continueButton, true)
        }
    }

    private fun recordInterruption(packageName: String, kind: String, outcome: String, reason: String, swipes: Int = 0) {
        InterruptionLog.record(prefs, packageName, kind, outcome, reason, swipes)
    }

    /**
     * Shared overlay: the app's icon and name, one sentence why, a countdown
     * when there is a pause, "back" as the main button, "continue" below it
     * and, on a lock, the emergency unlock. `configure` drives the countdown
     * or hint; `onShown` runs only when the overlay really appeared;
     * `onGoHome` when the user leaves through "back" or the back key.
     */
    private fun presentOverlay(
        blockedPackage: String,
        bodyText: String,
        continueText: String,
        showContinue: Boolean,
        onShown: () -> Unit = {},
        onContinue: () -> Unit,
        onGoHome: () -> Unit = {},
        configure: (OverlayViews) -> Unit,
    ) {
        if (!Settings.canDrawOverlays(this)) return

        mainHandler.post {
            if (overlayView != null) return@post
            // Worker decisions can be stale by the time the main thread runs.
            // Do not interrupt a different app, a disabled rule or a locked screen.
            if (!NativeRuntimePolicy.shouldPresentOverlay(
                    targetPackage = blockedPackage,
                    currentForegroundPackage = lastForegroundPackage,
                    isProtected = rules.containsKey(blockedPackage),
                    monitoringEnabled = monitoringEnabled,
                    screenInteractive = isScreenInteractive(),
                )
            ) return@post

            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                else
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.CENTER
            }

            val icon = ImageView(this).apply {
                val drawable = try {
                    packageManager.getApplicationIcon(blockedPackage)
                } catch (_: Exception) {
                    null
                }
                if (drawable != null) setImageDrawable(drawable) else visibility = View.GONE
            }

            val nameView = TextView(this).apply {
                text = getAppName(blockedPackage)
                textSize = 22f
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                setTextColor(colorText)
                setPadding(0, dp(16), 0, 0)
            }

            val bodyView = TextView(this).apply {
                text = bodyText
                textSize = 17f
                gravity = Gravity.CENTER
                setTextColor(colorBody)
                setLineSpacing(0f, 1.15f)
                setPadding(0, dp(12), 0, 0)
            }

            val countdownView = TextView(this).apply {
                textSize = 56f
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                setTextColor(colorText)
                setPadding(0, dp(24), 0, 0)
                visibility = View.GONE
            }

            val statusView = TextView(this).apply {
                textSize = 15f
                gravity = Gravity.CENTER
                setTextColor(colorMuted)
                setPadding(0, dp(12), 0, dp(32))
            }

            val homeButton = overlayButton(getString(R.string.overlay_go_home), primary = true).apply {
                setOnClickListener {
                    onGoHome()
                    goHome()
                }
            }

            val continueButton = overlayButton(continueText, primary = false).apply {
                visibility = if (showContinue) View.VISIBLE else View.GONE
                setOnClickListener { onContinue() }
            }
            setButtonEnabled(continueButton, false)

            val emergencyButton = overlayButton("", primary = false).apply {
                textSize = 14f
                setTextColor(colorMuted)
                visibility = View.GONE
            }

            val root = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setBackgroundColor(colorBackground)
                setPadding(dp(28), dp(48), dp(28), dp(48))
                isFocusableInTouchMode = true

                addView(icon, LinearLayout.LayoutParams(dp(72), dp(72)))
                addView(nameView, fullWidth())
                addView(bodyView, fullWidth())
                addView(countdownView, fullWidth())
                addView(statusView, fullWidth())
                addView(homeButton, fullWidth())
                addView(continueButton, fullWidth(top = dp(8)))
                addView(emergencyButton, fullWidth(top = dp(16)))

                setOnKeyListener { _, keyCode, event ->
                    if (keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_UP) {
                        onGoHome()
                        goHome()
                        true
                    } else {
                        false
                    }
                }
            }

            try {
                windowManager?.addView(root, params)
                overlayView = root
                overlayPackage = blockedPackage
                root.requestFocus()
                configure(OverlayViews(statusView, countdownView, continueButton, emergencyButton))
                onShown()
            } catch (_: Exception) {
                overlayView = null
                overlayPackage = null
            }
        }
    }

    private fun overlayButton(label: String, primary: Boolean): Button = Button(this).apply {
        text = label
        isAllCaps = false
        textSize = 16f
        stateListAnimator = null
        minHeight = dp(56)
        setTextColor(if (primary) colorOnAccent else colorText)
        background = GradientDrawable().apply {
            cornerRadius = dp(16).toFloat()
            setColor(if (primary) colorAccent else Color.TRANSPARENT)
        }
    }

    private fun fullWidth(top: Int = 0) = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
    ).apply { topMargin = top }

    private fun setButtonEnabled(button: Button, enabled: Boolean) {
        button.isEnabled = enabled
        button.alpha = if (enabled) 1f else 0.4f
    }

    /** The pause before "continue"; locks never get here. */
    private fun startCountdown(views: OverlayViews, totalSeconds: Int) {
        val owner = overlayView
        var remaining = totalSeconds
        val tick = object : Runnable {
            override fun run() {
                if (overlayView == null || overlayView !== owner) return
                if (remaining <= 0) {
                    views.countdown.visibility = View.GONE
                    views.status.text = getString(R.string.overlay_ready_hint)
                    setButtonEnabled(views.continueButton, true)
                    return
                }
                views.countdown.visibility = View.VISIBLE
                views.countdown.text = remaining.toString()
                views.status.text = resources.getQuantityString(R.plurals.overlay_countdown, remaining, remaining)
                remaining--
                mainHandler.postDelayed(this, 1000L)
            }
        }
        mainHandler.post(tick)
    }

    private fun dismissOverlay() {
        mainHandler.post {
            overlayView?.let { view ->
                try {
                    windowManager?.removeView(view)
                } catch (_: Exception) {
                    // View was already detached.
                }
            }
            overlayView = null
            overlayPackage = null
        }
    }

    private fun goHome() {
        dismissOverlay()
        try {
            val home = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(home)
        } catch (_: Exception) {
            // Nothing else we can do; the overlay is already gone.
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun getAppName(packageName: String): String {
        return try {
            val info = packageManager.getApplicationInfo(packageName, 0)
            packageManager.getApplicationLabel(info).toString()
        } catch (_: Exception) {
            packageName
        }
    }

    // ── Foreground notification ───────────────────────────────────────────────

    private fun buildNotification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.monitor_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.monitor_channel_description)
                setShowBadge(false)
            }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }

        val openIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.monitor_notification_title))
            .setContentText(getString(R.string.monitor_notification_text))
            .setSmallIcon(R.drawable.ic_stat_shield)
            .setContentIntent(openIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
