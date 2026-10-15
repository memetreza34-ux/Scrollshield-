package app.scrollshield.mobile

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * ShortVideoWatchService
 * ════════════════════════════════════════════════════════════════════
 * Accessibility service that recognises when a protected app's short-video
 * surface (Reels, Shorts, TikTok feed, Spotlight …) is on screen, counts the
 * scroll events inside it, and asks AppMonitorService to interrupt once the
 * user's own limits are reached.
 *
 * PRIVACY – this is a hard boundary, do not widen it:
 *  - The service reads ONLY `viewIdResourceName` and class names from the view
 *    tree. It never calls `getText()` or `getContentDescription()`, so no
 *    message, caption, password or search term is ever visible to it.
 *  - Nothing leaves the device. Counters live in the app's encrypted prefs.
 *  - Only packages with an active rule are inspected at all; every event from
 *    any other app returns immediately.
 *
 * DETECTION IS HEURISTIC:
 * View ids are not a public API. When a host app renames them, detection stops
 * working silently. The hints therefore arrive from the web layer
 * (src/lib/shortVideoSignatures.ts) and the last observed samples are stored so
 * the in-app calibration screen can show what the service really sees.
 *
 * @see docs/SHORT_VIDEO_DETECTION.md
 */
class ShortVideoWatchService : AccessibilityService() {

    companion object {
        @Volatile
        var isRunning = false
            private set

        /** Rescans the view tree at most this often; accessibility events fire far more. */
        const val TREE_SCAN_INTERVAL_MS = 700L

        /** Two scroll events closer than this count as one swipe. */
        const val SWIPE_DEBOUNCE_MS = 250L

        /** Depth and node budget for a single view-tree scan. */
        const val MAX_SCAN_DEPTH = 12
        const val MAX_SCAN_NODES = 400

        /** How long an interruption is suppressed after it was shown. */
        const val INTERVENTION_COOLDOWN_MS = 30_000L

        /** Number of calibration samples kept for the diagnostics screen. */
        const val MAX_CALIBRATION_SAMPLES = 20

        /**
         * Minimum gap between two stored calibration samples. Every sample is an
         * encrypted preferences write; scanning a normal feed every 700 ms must
         * not turn into a write every 700 ms.
         */
        const val CALIBRATION_SAMPLE_INTERVAL_MS = 10_000L

        const val SYSTEM_UI_PACKAGE = "com.android.systemui"

        const val KEY_SHORT_VIDEO_USAGE = "short_video_usage"
        const val KEY_CALIBRATION_SAMPLES = "calibration_samples"
    }

    private data class ShortVideoRule(
        val surfaceId: String,
        val mode: String,
        val dailyLimitMinutes: Int,
        val sessionLimitMinutes: Int,
        val stopAfterSwipes: Int,
        val hardInterrupt: Boolean,
        val viewIdHints: List<String>,
        val classNameHints: List<String>,
        val alwaysShortVideo: Boolean,
    )

    // ── State ─────────────────────────────────────────────────────────────────

    private var rules: Map<String, ShortVideoRule> = emptyMap()

    private var activePackage: String? = null
    private var inShortVideo = false
    private var surfaceEnteredAt = 0L
    private var swipesInSession = 0
    private var lastSwipeAt = 0L
    private var lastTreeScanAt = 0L
    private var lastInterventionAt = 0L
    private var ignoredPackages: Set<String> = emptySet()
    private var lastCalibrationAt = 0L
    private var lastCalibrationSignature: String? = null

    private val prefs: SharedPreferences by lazy { SecurePrefs.open(this) }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /**
     * Rules change while the service runs, so it listens for the same
     * config-update signal the monitor service reacts to. Registered
     * dynamically: a manifest receiver would not reach this instance.
     */
    private val configUpdateReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == AppMonitorService.ACTION_CONFIG_UPDATE) {
                loadRules()
                refreshIgnoredPackages()
            }
        }
    }

    private var receiverRegistered = false

    override fun onServiceConnected() {
        super.onServiceConnected()
        isRunning = true
        loadRules()
        refreshIgnoredPackages()

        if (!receiverRegistered) {
            val filter = android.content.IntentFilter(AppMonitorService.ACTION_CONFIG_UPDATE)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(configUpdateReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                @Suppress("UnspecifiedRegisterReceiverFlag")
                registerReceiver(configUpdateReceiver, filter)
            }
            receiverRegistered = true
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        leaveShortVideoSurface()

        if (receiverRegistered) {
            try {
                unregisterReceiver(configUpdateReceiver)
            } catch (_: Exception) {
                // Already gone.
            }
            receiverRegistered = false
        }
    }

    override fun onInterrupt() {
        leaveShortVideoSurface()
    }

    // ── Event handling ────────────────────────────────────────────────────────

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val eventPackage = event.packageName?.toString() ?: return

        // The status bar, the keyboard and ScrollShield's own overlay emit
        // events constantly while the user is in a feed. None of them means the
        // user left it.
        if (eventPackage in ignoredPackages) return

        // Cheapest possible rejection path: this fires for every app on the device.
        val rule = rules[eventPackage]
        if (rule == null) {
            // Only a real window change to another app ends the feed session.
            // Content and scroll events from other packages (floating bubbles,
            // picture-in-picture, widgets) would otherwise reset the swipe
            // counter and the session timer every few seconds.
            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
                if (activePackage != null) leaveShortVideoSurface()
                activePackage = null
            }
            return
        }

        if (eventPackage != activePackage) {
            leaveShortVideoSurface()
            activePackage = eventPackage
        }

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                val className = event.className?.toString().orEmpty()
                evaluateSurface(eventPackage, rule, className)
            }

            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                val now = System.currentTimeMillis()
                if (now - lastTreeScanAt >= TREE_SCAN_INTERVAL_MS) {
                    lastTreeScanAt = now
                    evaluateSurface(eventPackage, rule, null)
                }
            }

            AccessibilityEvent.TYPE_VIEW_SCROLLED -> {
                if (inShortVideo) countSwipe(eventPackage, rule)
            }
        }

        if (inShortVideo) enforceTimeLimits(eventPackage, rule)
    }

    /**
     * Packages whose events never say anything about the feed: ScrollShield
     * itself (its overlay), the system UI, and the current keyboard. The
     * keyboard can change, so this is refreshed together with the rules.
     */
    private fun refreshIgnoredPackages() {
        val keyboardPackage = try {
            Settings.Secure.getString(contentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
                ?.substringBefore('/')
        } catch (_: Exception) {
            null
        }
        ignoredPackages = setOfNotNull(packageName, SYSTEM_UI_PACKAGE, keyboardPackage)
    }

    // ── Surface detection ─────────────────────────────────────────────────────

    private fun evaluateSurface(packageName: String, rule: ShortVideoRule, className: String?) {
        val matched = when {
            rule.alwaysShortVideo -> true
            className != null && matchesHints(className, rule.classNameHints) -> true
            else -> {
                // No readable tree, or the active window belongs to someone else
                // (notification shade, a dialog mid-transition): that says
                // nothing about the feed, so the session stays as it is.
                val viewIds = collectViewIds(packageName) ?: return
                val found = viewIds.any { viewId -> matchesHints(viewId, rule.viewIdHints) }
                recordCalibrationSample(packageName, viewIds, className, found)
                found
            }
        }

        if (matched && !inShortVideo) {
            enterShortVideoSurface(packageName, rule)
        } else if (!matched && inShortVideo) {
            leaveShortVideoSurface()
        }
    }

    private fun matchesHints(candidate: String, hints: List<String>): Boolean {
        if (hints.isEmpty()) return false
        val lower = candidate.lowercase(Locale.ROOT)
        return hints.any { hint -> hint.isNotEmpty() && lower.contains(hint.lowercase(Locale.ROOT)) }
    }

    /**
     * Collects view resource ids from the active window. Reads no text: only
     * `viewIdResourceName`, which requires `flagReportViewIds` in the service
     * config. Bounded in depth and node count so a deep feed cannot stall the
     * accessibility thread.
     *
     * Returns null when the active window cannot be read or does not belong to
     * [expectedPackage].
     */
    private fun collectViewIds(expectedPackage: String): List<String>? {
        val root = try {
            rootInActiveWindow
        } catch (_: Exception) {
            null
        } ?: return null

        if (root.packageName?.toString() != expectedPackage) return null

        val collected = mutableListOf<String>()
        val queue = ArrayDeque<Pair<AccessibilityNodeInfo, Int>>()
        queue.add(root to 0)
        var visited = 0

        while (queue.isNotEmpty() && visited < MAX_SCAN_NODES) {
            val (node, depth) = queue.removeFirst()
            visited++

            node.viewIdResourceName?.let(collected::add)

            if (depth < MAX_SCAN_DEPTH) {
                for (index in 0 until node.childCount) {
                    val child = try {
                        node.getChild(index)
                    } catch (_: Exception) {
                        null
                    }
                    if (child != null) queue.add(child to depth + 1)
                }
            }
        }

        return collected
    }

    // ── Session tracking ──────────────────────────────────────────────────────

    private fun enterShortVideoSurface(packageName: String, rule: ShortVideoRule) {
        inShortVideo = true
        surfaceEnteredAt = System.currentTimeMillis()
        swipesInSession = 0

        // A blocked feed is interrupted the moment it appears.
        if (rule.mode == "block") {
            intervene(packageName, rule, InterventionReason.BLOCKED)
        }
    }

    private fun leaveShortVideoSurface() {
        if (!inShortVideo) return
        val packageName = activePackage
        val elapsed = System.currentTimeMillis() - surfaceEnteredAt
        if (packageName != null && elapsed > 0) {
            recordUsage(packageName, elapsed)
        }
        inShortVideo = false
        surfaceEnteredAt = 0L
        swipesInSession = 0
    }

    private fun countSwipe(packageName: String, rule: ShortVideoRule) {
        val now = System.currentTimeMillis()
        if (now - lastSwipeAt < SWIPE_DEBOUNCE_MS) return
        lastSwipeAt = now
        swipesInSession++

        if (rule.stopAfterSwipes > 0 && swipesInSession % rule.stopAfterSwipes == 0) {
            intervene(packageName, rule, InterventionReason.SWIPES)
        }
    }

    private fun enforceTimeLimits(packageName: String, rule: ShortVideoRule) {
        val now = System.currentTimeMillis()
        val sessionMinutes = ((now - surfaceEnteredAt) / 60_000L).toInt()

        if (rule.sessionLimitMinutes > 0 && sessionMinutes >= rule.sessionLimitMinutes) {
            intervene(packageName, rule, InterventionReason.SESSION_LIMIT)
            return
        }

        if (rule.dailyLimitMinutes > 0) {
            val todayMinutes = readUsageMinutes(packageName) + sessionMinutes
            if (todayMinutes >= rule.dailyLimitMinutes) {
                intervene(packageName, rule, InterventionReason.DAILY_LIMIT)
            }
        }
    }

    // ── Intervention ──────────────────────────────────────────────────────────

    private enum class InterventionReason { SWIPES, SESSION_LIMIT, DAILY_LIMIT, BLOCKED }

    private fun intervene(packageName: String, rule: ShortVideoRule, reason: InterventionReason) {
        // No overlay and no "back" during a call; the next event after it
        // intervenes again if the limit still applies.
        if (CallState.isActive(this)) return

        val now = System.currentTimeMillis()
        if (now - lastInterventionAt < INTERVENTION_COOLDOWN_MS) return
        lastInterventionAt = now

        // Flush the time spent so far so the overlay shows current numbers.
        if (surfaceEnteredAt > 0) {
            recordUsage(packageName, now - surfaceEnteredAt)
            surfaceEnteredAt = now
        }

        // A blocked feed that offers "continue" is not blocked.
        val hardInterrupt = rule.hardInterrupt || rule.mode == "block"

        val intent = Intent(this, AppMonitorService::class.java).apply {
            action = AppMonitorService.ACTION_SHORT_VIDEO_INTERRUPT
            putExtra(AppMonitorService.EXTRA_PACKAGE_NAME, packageName)
            putExtra(AppMonitorService.EXTRA_SURFACE_ID, rule.surfaceId)
            putExtra(AppMonitorService.EXTRA_REASON, reason.name)
            putExtra(AppMonitorService.EXTRA_HARD_INTERRUPT, hardInterrupt)
            putExtra(AppMonitorService.EXTRA_SWIPES, swipesInSession)
        }

        try {
            // ContextCompat: startForegroundService() only exists from Android 8,
            // and the NoSuchMethodError on Android 7 is not an Exception.
            ContextCompat.startForegroundService(this, intent)
        } catch (_: Exception) {
            // Monitoring service unavailable – fall back to leaving the feed.
        }

        // A hard interrupt also navigates out of the feed. GLOBAL_ACTION_BACK is
        // a standard accessibility action and needs no gesture capability.
        if (hardInterrupt) {
            try {
                performGlobalAction(GLOBAL_ACTION_BACK)
            } catch (_: Exception) {
                // Best effort only.
            }
        }
    }

    // ── Persistence ───────────────────────────────────────────────────────────

    private fun loadRules() {
        val raw = prefs.getString(ScrollShieldBridgePlugin.KEY_BLOCKED_RULES, "[]") ?: "[]"
        val parsed = mutableMapOf<String, ShortVideoRule>()

        try {
            val array = JSONArray(raw)
            for (index in 0 until array.length()) {
                val entry = array.optJSONObject(index) ?: continue
                val packageName = entry.optString("packageName")
                val feed = entry.optJSONObject("shortVideo")
                if (packageName.isEmpty() || feed == null) continue

                parsed[packageName] = ShortVideoRule(
                    surfaceId = feed.optString("surfaceId", "short_video"),
                    mode = feed.optString("mode", "warn"),
                    dailyLimitMinutes = feed.optInt("dailyLimitMinutes", 0),
                    sessionLimitMinutes = feed.optInt("sessionLimitMinutes", 0),
                    stopAfterSwipes = feed.optInt("stopAfterSwipes", 0),
                    hardInterrupt = feed.optBoolean("hardInterrupt", false),
                    viewIdHints = feed.optJSONArray("viewIdHints").toStringList(),
                    classNameHints = feed.optJSONArray("classNameHints").toStringList(),
                    alwaysShortVideo = feed.optBoolean("alwaysShortVideo", false),
                )
            }
        } catch (_: Exception) {
            return
        }

        rules = parsed
    }

    private fun JSONArray?.toStringList(): List<String> {
        if (this == null) return emptyList()
        return (0 until length()).mapNotNull { index -> optString(index).takeIf { it.isNotEmpty() } }
    }

    private fun todayKey(): String = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(Date())

    private fun readUsageObject(): JSONObject {
        val raw = prefs.getString(KEY_SHORT_VIDEO_USAGE, null) ?: return JSONObject()
        return try {
            val stored = JSONObject(raw)
            // Usage counters are per day; drop them when the day rolls over.
            if (stored.optString("date") == todayKey()) stored else JSONObject()
        } catch (_: Exception) {
            JSONObject()
        }
    }

    private fun readUsageMinutes(packageName: String): Int {
        val packages = readUsageObject().optJSONObject("packages") ?: return 0
        return (packages.optLong(packageName, 0L) / 60_000L).toInt()
    }

    private fun recordUsage(packageName: String, elapsedMs: Long) {
        if (elapsedMs <= 0L) return
        try {
            val stored = readUsageObject()
            val packages = stored.optJSONObject("packages") ?: JSONObject()
            packages.put(packageName, packages.optLong(packageName, 0L) + elapsedMs)
            stored.put("date", todayKey())
            stored.put("packages", packages)
            stored.put("updatedAt", System.currentTimeMillis())
            prefs.edit().putString(KEY_SHORT_VIDEO_USAGE, stored.toString()).apply()
        } catch (_: Exception) {
            // Losing a usage tick must never crash the accessibility service.
        }
    }

    /**
     * Stores what the service saw, so the diagnostics screen can show whether a
     * signature still matches this build of the host app. View ids and class
     * names only – never text.
     */
    private fun recordCalibrationSample(
        packageName: String,
        viewIds: List<String>,
        className: String?,
        matched: Boolean,
    ) {
        if (viewIds.isEmpty() && className.isNullOrEmpty()) return

        // Only a changed picture is worth an encrypted write, and even then at
        // most one per interval.
        val now = System.currentTimeMillis()
        if (now - lastCalibrationAt < CALIBRATION_SAMPLE_INTERVAL_MS) return
        val storedIds = viewIds.distinct().take(40)
        val signature = "$packageName|${className.orEmpty()}|$matched|${storedIds.sorted().joinToString(",")}"
        if (signature == lastCalibrationSignature) return
        lastCalibrationAt = now
        lastCalibrationSignature = signature

        try {
            val raw = prefs.getString(KEY_CALIBRATION_SAMPLES, "[]") ?: "[]"
            val samples = JSONArray(raw)

            val sample = JSONObject()
                .put("packageName", packageName)
                .put("viewIds", JSONArray(storedIds))
                .put("classNames", JSONArray(listOfNotNull(className)))
                .put("matchedPlatformId", if (matched) packageName else null)
                .put("observedAt", now)

            samples.put(sample)

            val trimmed = JSONArray()
            val start = maxOf(0, samples.length() - MAX_CALIBRATION_SAMPLES)
            for (index in start until samples.length()) {
                trimmed.put(samples.get(index))
            }

            prefs.edit().putString(KEY_CALIBRATION_SAMPLES, trimmed.toString()).apply()
        } catch (_: Exception) {
            // Diagnostics are optional.
        }
    }
}
