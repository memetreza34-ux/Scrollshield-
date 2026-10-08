package app.scrollshield.mobile

import android.content.SharedPreferences
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * How many emergency unlocks each app used today, so the lock screen can
 * enforce the daily maximum. Counts reset with the local date.
 *
 * Called from overlay buttons on the main thread and from the monitor's worker
 * thread, hence the lock.
 */
object EmergencyLog {
    const val KEY_EMERGENCY_UNLOCKS = "emergency_unlocks"

    private val lock = Any()

    private fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(Date())

    /** Today's counts, or an empty object when the stored ones are from another day. */
    private fun load(prefs: SharedPreferences): JSONObject {
        return try {
            val stored = JSONObject(prefs.getString(KEY_EMERGENCY_UNLOCKS, "{}") ?: "{}")
            if (stored.optString("date") == today()) stored.optJSONObject("counts") ?: JSONObject() else JSONObject()
        } catch (_: Exception) {
            JSONObject()
        }
    }

    fun countToday(prefs: SharedPreferences, appId: String): Int {
        synchronized(lock) {
            return load(prefs).optInt(appId, 0)
        }
    }

    fun record(prefs: SharedPreferences, appId: String) {
        synchronized(lock) {
            val counts = load(prefs)
            counts.put(appId, counts.optInt(appId, 0) + 1)
            prefs.edit()
                .putString(KEY_EMERGENCY_UNLOCKS, JSONObject().put("date", today()).put("counts", counts).toString())
                .apply()
        }
    }
}
