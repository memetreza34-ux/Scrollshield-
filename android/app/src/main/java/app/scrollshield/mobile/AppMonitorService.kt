package app.scrollshield.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray

/**
 * AppMonitorService
 * ════════════════════════════════════════════════════════════════════
 * A foreground service that polls which app is in front every second.
 * When a blocked app is detected, it shows a SYSTEM_ALERT_WINDOW overlay
 * with a countdown timer that the user must wait through before continuing.
 *
 * Lifecycle:
 *  - Started by ScrollShieldBridgePlugin.startMonitoring()
 *  - Stopped  by ScrollShieldBridgePlugin.stopMonitoring()
 *  - Config is updated via notifyConfigUpdate() without restarting the service
 */
class AppMonitorService : Service() {

    companion object {
        const val CHANNEL_ID = "scrollshield_monitor"
        const val NOTIF_ID = 1001
        const val ACTION_CONFIG_UPDATE = "app.scrollshield.ACTION_CONFIG_UPDATE"
        const val POLL_INTERVAL_MS = 1000L   // Check every second
        const val OVERLAY_DELAY_SECONDS = 5  // Default countdown seconds

        /** True while the service is running – read by the plugin to expose state to JS. */
        @Volatile
        var isRunning = false
            private set

        /** Sends a config-update broadcast to a running instance. */
        fun notifyConfigUpdate(context: Context) {
            context.sendBroadcast(Intent(ACTION_CONFIG_UPDATE).setPackage(context.packageName))
        }
    }

    // ── State ─────────────────────────────────────────────────────────────────

    private val handler = Handler(Looper.getMainLooper())
    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var blockedPackages: Set<String> = emptySet()
    private var lastForegroundPackage: String? = null
    private var overlayShowing = false

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
        } catch (e: Exception) {
            getSharedPreferences(ScrollShieldBridgePlugin.PREF_FILE, MODE_PRIVATE)
        }
    }

    // ── Polling runnable ──────────────────────────────────────────────────────

    private val pollRunnable = object : Runnable {
        override fun run() {
            checkForegroundApp()
            handler.postDelayed(this, POLL_INTERVAL_MS)
        }
    }

    // ── Service lifecycle ─────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        loadBlockedPackages()
        startForeground(NOTIF_ID, buildNotification())
        handler.post(pollRunnable)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_CONFIG_UPDATE) {
            loadBlockedPackages()
        }
        return START_STICKY // Restart automatically if killed by system
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        handler.removeCallbacks(pollRunnable)
        dismissOverlay()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Core logic ────────────────────────────────────────────────────────────

    private fun loadBlockedPackages() {
        val raw = prefs.getString(ScrollShieldBridgePlugin.KEY_BLOCKED_PACKAGES, "[]") ?: "[]"
        val arr = try { JSONArray(raw) } catch (e: Exception) { JSONArray() }
        blockedPackages = (0 until arr.length()).map { arr.getString(it) }.toSet()
    }

    private fun checkForegroundApp() {
        val usm = getSystemService(USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()
        val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, now - 5_000L, now)
        val foreground = stats?.maxByOrNull { it.lastTimeUsed }?.packageName ?: return

        // Ignore our own app
        if (foreground == packageName) {
            if (overlayShowing) dismissOverlay()
            lastForegroundPackage = foreground
            return
        }

        // Only trigger when the app JUST came to foreground (edge transition)
        if (foreground == lastForegroundPackage) return
        lastForegroundPackage = foreground

        if (foreground in blockedPackages && !overlayShowing) {
            showCountdownOverlay(foreground, OVERLAY_DELAY_SECONDS)
        }
    }

    // ── Overlay ───────────────────────────────────────────────────────────────

    private fun showCountdownOverlay(packageName: String, seconds: Int) {
        if (!Settings.canDrawOverlays(this)) return

        handler.post {
            if (overlayShowing) return@post
            overlayShowing = true

            // Simple overlay view – full-screen dark background with countdown text
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                else
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.CENTER
            }

            // Build a minimal overlay view programmatically (no XML layout required)
            val tv = TextView(this).apply {
                text = buildOverlayText(getAppName(packageName), seconds)
                textSize = 22f
                gravity = Gravity.CENTER
                setTextColor(android.graphics.Color.WHITE)
                setBackgroundColor(android.graphics.Color.parseColor("#E6050505"))
                setPadding(48, 48, 48, 48)
            }
            overlayView = tv

            try {
                windowManager?.addView(tv, params)
                startCountdown(tv, packageName, seconds)
            } catch (e: Exception) {
                overlayShowing = false
            }
        }
    }

    private fun startCountdown(view: TextView, packageName: String, totalSeconds: Int) {
        var remaining = totalSeconds
        val tick = object : Runnable {
            override fun run() {
                if (remaining <= 0) {
                    dismissOverlay()
                    return
                }
                view.text = buildOverlayText(getAppName(packageName), remaining)
                remaining--
                handler.postDelayed(this, 1000L)
            }
        }
        handler.post(tick)
    }

    private fun dismissOverlay() {
        handler.post {
            overlayView?.let {
                try { windowManager?.removeView(it) } catch (_: Exception) {}
            }
            overlayView = null
            overlayShowing = false
        }
    }

    private fun buildOverlayText(appName: String, secondsLeft: Int): String =
        "🛡️ ScrollShield\n\n$appName ist geschützt.\n\nBitte warte noch $secondsLeft Sekunde${if (secondsLeft != 1) "n" else ""}…\n\n(Diese Pause macht dich bewusster.)"

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
        val channelName = "ScrollShield Schutz"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                channelName,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "ScrollShield überwacht aktiv geschützte Apps."
                setShowBadge(false)
            }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }

        val openIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ScrollShield ist aktiv")
            .setContentText("Deine Apps sind geschützt.")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(openIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
