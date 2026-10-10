package app.scrollshield.mobile

import android.content.SharedPreferences
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Emergency unlocks are a safety exit, so both today's quota and an approved
 * expiry must survive a monitor process restart. Stored locally in encrypted
 * SharedPreferences; the two updates share one synchronous, atomic editor.
 */
object EmergencyLog {
    const val KEY_EMERGENCY_UNLOCKS = "emergency_unlocks"
    const val KEY_ACTIVE_EMERGENCY_UNTIL = "emergency_active_until"

    private val lock = Any()

    private fun localDay(at: Long): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(Date(at))

    private fun loadCounts(prefs: SharedPreferences, day: String): JSONObject =
        try {
            val stored = JSONObject(prefs.getString(KEY_EMERGENCY_UNLOCKS, "{}") ?: "{}")
            if (stored.optString("date") == day) stored.optJSONObject("counts") ?: JSONObject() else JSONObject()
        } catch (_: Exception) {
            JSONObject()
        }

    private fun loadActive(prefs: SharedPreferences): JSONObject =
        try {
            JSONObject(prefs.getString(KEY_ACTIVE_EMERGENCY_UNTIL, "{}") ?: "{}")
        } catch (_: Exception) {
            JSONObject()
        }

    fun countToday(prefs: SharedPreferences, appId: String): Int =
        synchronized(lock) {
            loadCounts(prefs, localDay(System.currentTimeMillis())).optInt(appId, 0).coerceAtLeast(0)
        }

    /**
     * Claim ONE of today's limited grants and persist its expiry *together*.
     * Returns null if the quota is spent, fields are invalid or saving failed.
     * commit() is deliberate: the user's successful unlock must survive an
     * immediate process kill; apply() could still be waiting for a disk write.
     */
    fun tryGrant(
        prefs: SharedPreferences,
        appId: String,
        maxPerDay: Int,
        durationMinutes: Int,
        nowEpochMillis: Long = System.currentTimeMillis(),
    ): Long? = synchronized(lock) {
        if (appId.isBlank()) return@synchronized null
        try {
            val day = localDay(nowEpochMillis)
            val counts = loadCounts(prefs, day)
            val used = counts.optInt(appId, 0)
            if (!EmergencyGrantPolicy.canGrant(used, maxPerDay, durationMinutes)) return@synchronized null

            val expiresAt = EmergencyGrantPolicy.expiresAt(nowEpochMillis, durationMinutes)
            if (expiresAt <= nowEpochMillis) return@synchronized null
            counts.put(appId, used + 1)

            val active = loadActive(prefs)
            // Don't accumulate expired entries indefinitely.
            val keys = active.keys()
            val expired = mutableListOf<String>()
            while (keys.hasNext()) {
                val key = keys.next()
                if (!EmergencyGrantPolicy.isActive(active.optLong(key, 0L), nowEpochMillis)) expired.add(key)
            }
            expired.forEach { active.remove(it) }
            active.put(appId, expiresAt)

            val saved = prefs.edit()
                .putString(KEY_EMERGENCY_UNLOCKS, JSONObject().put("date", day).put("counts", counts).toString())
                .putString(KEY_ACTIVE_EMERGENCY_UNTIL, active.toString())
                .commit()
            if (saved) expiresAt else null
        } catch (_: Exception) {
            null
        }
    }

    /** Restore only unexpired release windows on service creation/restart. */
    fun activeUnlocks(prefs: SharedPreferences, nowEpochMillis: Long = System.currentTimeMillis()): Map<String, Long> =
        synchronized(lock) {
            val active = loadActive(prefs)
            val restored = mutableMapOf<String, Long>()
            val keys = active.keys()
            while (keys.hasNext()) {
                val appId = keys.next()
                val expiry = active.optLong(appId, 0L)
                if (appId.isNotBlank() && EmergencyGrantPolicy.isActive(expiry, nowEpochMillis)) {
                    restored[appId] = expiry
                }
            }
            restored
        }
}
