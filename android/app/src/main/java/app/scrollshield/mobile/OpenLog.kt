package app.scrollshield.mobile

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * When protected apps were opened, per app id, for the anti-binge rule. An
 * opening is what the web layer logs as 'open': the user chose "continue", or
 * received a native emergency grant. Kept for a day.
 *
 * Called from the monitor's worker thread and from overlay buttons on the main
 * thread, hence the lock.
 */
class OpenLog(private val prefs: SharedPreferences) {

    companion object {
        const val KEY_OPEN_TIMES = "app_open_times"
        const val RETENTION_MS = 24 * 60 * 60_000L
        const val MAX_PER_APP = 200
    }

    private val lock = Any()
    private var cache: MutableMap<String, MutableList<Long>>? = null

    fun record(appId: String, at: Long) {
        synchronized(lock) {
            val times = load().getOrPut(appId) { mutableListOf() }
            times.add(at)
            prune(at)
            save()
        }
    }

    /** Openings within the last `windowMinutes`, not counting the current attempt. */
    fun count(appId: String, now: Long, windowMinutes: Int): Int {
        synchronized(lock) {
            val since = now - windowMinutes * 60_000L
            return load()[appId]?.count { it > since } ?: 0
        }
    }

    private fun load(): MutableMap<String, MutableList<Long>> {
        cache?.let { return it }

        val parsed = mutableMapOf<String, MutableList<Long>>()
        try {
            val stored = JSONObject(prefs.getString(KEY_OPEN_TIMES, "{}") ?: "{}")
            val keys = stored.keys()
            while (keys.hasNext()) {
                val appId = keys.next()
                val array = stored.optJSONArray(appId) ?: continue
                parsed[appId] = (0 until array.length()).map { index -> array.optLong(index) }.toMutableList()
            }
        } catch (_: Exception) {
            // Start empty; losing old openings only makes anti-binge more lenient.
        }

        cache = parsed
        return parsed
    }

    private fun prune(now: Long) {
        val oldest = now - RETENTION_MS
        val entries = load()
        for (times in entries.values) {
            times.removeAll { it < oldest }
            while (times.size > MAX_PER_APP) times.removeAt(0)
        }
        entries.values.removeAll { it.isEmpty() }
    }

    private fun save() {
        val stored = JSONObject()
        for ((appId, times) in load()) {
            stored.put(appId, JSONArray(times))
        }
        prefs.edit().putString(KEY_OPEN_TIMES, stored.toString()).apply()
    }
}
