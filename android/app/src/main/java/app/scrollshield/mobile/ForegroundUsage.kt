package app.scrollshield.mobile

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import java.util.Calendar

/**
 * How long protected apps were in the foreground today, computed from the
 * UsageStatsManager event stream since local midnight. The aggregated daily
 * buckets do not follow the local day, so they are not used.
 *
 * Only the given packages are looked at; everything else in the stream is
 * skipped and nothing is stored.
 */
object ForegroundUsage {

    fun startOfToday(): Long = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    /** Minutes per package since local midnight; 0 for packages without use. */
    @Suppress("DEPRECATION") // MOVE_TO_* equal ACTIVITY_RESUMED/PAUSED and also cover Android 9.
    fun minutesToday(context: Context, packages: Set<String>): Map<String, Int> {
        if (packages.isEmpty()) return emptyMap()
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return emptyMap()

        val now = System.currentTimeMillis()
        val events = try {
            usageStatsManager.queryEvents(startOfToday(), now)
        } catch (_: Exception) {
            null
        } ?: return emptyMap()

        // An app can have several activities resumed in overlapping order, so
        // time runs while at least one of them is in front.
        val resumed = mutableMapOf<String, Int>()
        val since = mutableMapOf<String, Long>()
        val totals = mutableMapOf<String, Long>()
        val event = UsageEvents.Event()

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val packageName = event.packageName ?: continue
            if (packageName !in packages) continue

            when (event.eventType) {
                UsageEvents.Event.MOVE_TO_FOREGROUND -> {
                    val count = resumed[packageName] ?: 0
                    if (count == 0) since[packageName] = event.timeStamp
                    resumed[packageName] = count + 1
                }

                UsageEvents.Event.MOVE_TO_BACKGROUND -> {
                    val count = resumed[packageName] ?: 0
                    if (count == 0) continue
                    if (count == 1) {
                        since.remove(packageName)?.let { start ->
                            totals[packageName] = (totals[packageName] ?: 0L) + (event.timeStamp - start)
                        }
                    }
                    resumed[packageName] = count - 1
                }
            }
        }

        // Still in front right now.
        for ((packageName, start) in since) {
            totals[packageName] = (totals[packageName] ?: 0L) + (now - start)
        }

        return packages.associateWith { packageName -> ((totals[packageName] ?: 0L) / 60_000L).toInt() }
    }
}
