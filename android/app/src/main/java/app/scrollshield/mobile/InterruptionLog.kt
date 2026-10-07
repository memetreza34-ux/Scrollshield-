package app.scrollshield.mobile

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * Interruptions shown by AppMonitorService, kept until the web layer has taken
 * them into its history (src/lib/nativeEvents.ts) and acknowledged them.
 * Without this the overlay left no trace: dashboard, statistics and relapse
 * warning only saw what happened inside ScrollShield.
 *
 * Only package names, reasons and times are stored – nothing from the screen.
 */
object InterruptionLog {
    const val KEY_INTERRUPTION_EVENTS = "interruption_events"

    /** Upper bound while ScrollShield itself is not opened for a long time. */
    const val MAX_EVENTS = 300

    /** Interruption of a whole app, or of its short-video feed. */
    const val KIND_APP = "app"
    const val KIND_SHORT_VIDEO = "short_video"

    /** The interruption locked the app or feed; no way to continue. */
    const val OUTCOME_BLOCKED = "blocked"

    /** A soft interruption was shown; the user may go on. */
    const val OUTCOME_WARNED = "warned"

    /** The user chose "back to home screen" at a soft interruption. */
    const val OUTCOME_STOPPED = "stopped"

    /** The user chose "continue" and opened the app. */
    const val OUTCOME_CONTINUED = "continued"

    /** The user lifted a lock with an emergency unlock. */
    const val OUTCOME_EMERGENCY = "emergency"

    private val lock = Any()

    fun record(
        prefs: SharedPreferences,
        packageName: String,
        kind: String,
        outcome: String,
        reason: String,
        swipes: Int = 0,
    ) {
        synchronized(lock) {
            try {
                val stored = read(prefs)
                stored.put(
                    JSONObject()
                        .put("id", UUID.randomUUID().toString())
                        .put("timestamp", System.currentTimeMillis())
                        .put("packageName", packageName)
                        .put("kind", kind)
                        .put("outcome", outcome)
                        .put("reason", reason)
                        .put("swipes", swipes)
                )

                val trimmed = JSONArray()
                val start = maxOf(0, stored.length() - MAX_EVENTS)
                for (index in start until stored.length()) {
                    trimmed.put(stored.get(index))
                }
                prefs.edit().putString(KEY_INTERRUPTION_EVENTS, trimmed.toString()).apply()
            } catch (_: Exception) {
                // Losing one entry must never take the overlay down.
            }
        }
    }

    fun read(prefs: SharedPreferences): JSONArray {
        return try {
            JSONArray(prefs.getString(KEY_INTERRUPTION_EVENTS, "[]") ?: "[]")
        } catch (_: Exception) {
            JSONArray()
        }
    }

    /** Drops the events the web layer has taken over. */
    fun acknowledge(prefs: SharedPreferences, ids: Set<String>) {
        if (ids.isEmpty()) return
        synchronized(lock) {
            val stored = read(prefs)
            val kept = JSONArray()
            for (index in 0 until stored.length()) {
                val event = stored.optJSONObject(index) ?: continue
                if (event.optString("id") !in ids) kept.put(event)
            }
            prefs.edit().putString(KEY_INTERRUPTION_EVENTS, kept.toString()).apply()
        }
    }
}
