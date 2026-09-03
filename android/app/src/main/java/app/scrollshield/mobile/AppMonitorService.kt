package app.scrollshield.mobile

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
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray

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
 *  - standard → countdown of the app's own openDelay, then "continue" unlocks
 *  - strict   → no continue button; only "back to home screen"
 *
 * Known limits (documented in docs/NATIVE_ANDROID.md):
 *  - Detection is event based and lags an app switch by up to POLL_INTERVAL_MS.
 *  - The overlay cannot prevent the user from leaving via gestures; it
 *    reappears the next time the protected app comes to the foreground.
 *  - Daily limits and anti-binge rules are still evaluated in the web layer
 *    only; the native side receives the resulting mode and delay.
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

        /** How long an app stays unblocked after the user chose to continue. */
        const val GRACE_PERIOD_MS = 5 * 60_000L

        /** True while the service is running – read by the plugin to expose state to JS. */
        @Volatile
        var isRunning = false
            private set

        /** Asks a running instance to reload its rules. */
        fun notifyConfigUpdate(context: Context) {
            val intent = Intent(context, AppMonitorService::class.java).setAction(ACTION_CONFIG_UPDATE)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (_: Exception) {
                // Service not running or start not allowed from background – rules
                // are loaded again the next time monitoring starts.
            }
        }
    }

    private data class BlockRule(val mode: String, val delaySeconds: Int)

    // ── State ─────────────────────────────────────────────────────────────────

    private val mainHandler = Handler(Looper.getMainLooper())
    private lateinit var workerThread: HandlerThread
    private lateinit var workerHandler: Handler

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var overlayPackage: String? = null

    @Volatile
    private var rules: Map<String, BlockRule> = emptyMap()

    @Volatile
    private var monitoringEnabled = false

    private var lastForegroundPackage: String? = null
    private val allowedUntil = mutableMapOf<String, Long>()

    private val prefs: SharedPreferences by lazy {
        try {
            val masterKey = MasterKey.Builder(this)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                this,
                ScrollShieldBridgePlugin.PREF_FILE,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (_: Exception) {
            getSharedPreferences(ScrollShieldBridgePlugin.PREF_FILE, MODE_PRIVATE)
        }
    }

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
        workerHandler.post(pollRunnable)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // A restart by the system delivers a null intent; make sure the
        // notification is up before anything else happens.
        startInForeground()
        if (intent?.action == ACTION_CONFIG_UPDATE) {
            loadRules()
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

    private fun loadRules() {
        monitoringEnabled = prefs.getBoolean(ScrollShieldBridgePlugin.KEY_MONITORING_ENABLED, false)

        val raw = prefs.getString(ScrollShieldBridgePlugin.KEY_BLOCKED_RULES, "[]") ?: "[]"
        val parsed = mutableMapOf<String, BlockRule>()
        try {
            val array = JSONArray(raw)
            for (index in 0 until array.length()) {
                val entry = array.optJSONObject(index)
                if (entry != null) {
                    val packageName = entry.optString("packageName")
                    if (packageName.isNotEmpty()) {
                        parsed[packageName] = BlockRule(
                            mode = entry.optString("mode", "standard"),
                            delaySeconds = entry.optInt("delaySeconds", DEFAULT_DELAY_SECONDS)
                        )
                    }
                } else {
                    // Backwards compatible with the previous plain package-name list.
                    val packageName = array.optString(index)
                    if (packageName.isNotEmpty()) {
                        parsed[packageName] = BlockRule("standard", DEFAULT_DELAY_SECONDS)
                    }
                }
            }
        } catch (_: Exception) {
            // Keep the previous rule set on malformed input.
            return
        }

        rules = parsed
        if (!monitoringEnabled || parsed.isEmpty()) {
            dismissOverlay()
        }
    }

    // ── Core logic ────────────────────────────────────────────────────────────

    private fun checkForegroundApp() {
        if (!monitoringEnabled || rules.isEmpty()) return

        val foreground = queryForegroundPackage() ?: return

        if (foreground == packageName) {
            dismissOverlay()
            lastForegroundPackage = foreground
            return
        }

        // Leaving the protected app takes the overlay with it.
        if (overlayPackage != null && overlayPackage != foreground) {
            dismissOverlay()
        }

        if (foreground == lastForegroundPackage) return
        lastForegroundPackage = foreground

        val rule = rules[foreground] ?: return
        if (System.currentTimeMillis() < (allowedUntil[foreground] ?: 0L)) return

        showInterruptionOverlay(foreground, rule)
    }

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

    private fun showInterruptionOverlay(blockedPackage: String, rule: BlockRule) {
        if (!Settings.canDrawOverlays(this)) return

        mainHandler.post {
            if (overlayView != null) return@post

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

            val appName = getAppName(blockedPackage)
            val statusView = TextView(this).apply {
                textSize = 16f
                gravity = Gravity.CENTER
                setTextColor(Color.parseColor("#A1A1AA"))
                setPadding(0, dp(16), 0, dp(28))
            }

            val continueButton = Button(this).apply {
                text = getString(R.string.overlay_continue)
                isEnabled = false
                visibility = if (rule.mode == "strict") View.GONE else View.VISIBLE
                setOnClickListener {
                    allowedUntil[blockedPackage] = System.currentTimeMillis() + GRACE_PERIOD_MS
                    dismissOverlay()
                }
            }

            val homeButton = Button(this).apply {
                text = getString(R.string.overlay_go_home)
                setOnClickListener { goHome() }
            }

            val root = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setBackgroundColor(Color.parseColor("#F2050505"))
                setPadding(dp(32), dp(48), dp(32), dp(48))
                isFocusableInTouchMode = true

                addView(TextView(context).apply {
                    text = getString(R.string.overlay_title)
                    textSize = 24f
                    gravity = Gravity.CENTER
                    setTextColor(Color.WHITE)
                })
                addView(TextView(context).apply {
                    text = getString(R.string.overlay_body, appName)
                    textSize = 18f
                    gravity = Gravity.CENTER
                    setTextColor(Color.parseColor("#E4E4E7"))
                    setPadding(0, dp(20), 0, 0)
                })
                addView(statusView)
                addView(continueButton)
                addView(homeButton)

                setOnKeyListener { _, keyCode, event ->
                    if (keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_UP) {
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
                startCountdown(statusView, continueButton, rule)
            } catch (_: Exception) {
                overlayView = null
                overlayPackage = null
            }
        }
    }

    private fun startCountdown(statusView: TextView, continueButton: Button, rule: BlockRule) {
        val totalSeconds = when (rule.mode) {
            "soft" -> 0
            "strict" -> 0
            else -> rule.delaySeconds.coerceAtLeast(0)
        }

        if (rule.mode == "strict") {
            statusView.text = getString(R.string.overlay_strict_hint)
            return
        }

        var remaining = totalSeconds
        val tick = object : Runnable {
            override fun run() {
                if (overlayView == null) return
                if (remaining <= 0) {
                    statusView.text = getString(R.string.overlay_ready_hint)
                    continueButton.isEnabled = true
                    return
                }
                statusView.text = resources.getQuantityString(R.plurals.overlay_countdown, remaining, remaining)
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
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(openIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
