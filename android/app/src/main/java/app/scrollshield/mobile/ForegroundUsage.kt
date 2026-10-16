package app.scrollshield.mobile

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
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

    /** Today's foreground time: minutes per package, and summed over all of them per local hour (24 entries). */
    class Today(val minutes: Map<String, Int>, val minutesPerHour: IntArray)

    /** Minutes per package since local midnight; 0 for packages without use. */
    fun minutesToday(context: Context, packages: Set<String>): Map<String, Int> = usageToday(context, packages).minutes

    /** Minutes per package and per hour since local midnight. */
    @Suppress("DEPRECATION") // MOVE_TO_* equal ACTIVITY_RESUMED/PAUSED and also cover Android 9.
    fun usageToday(context: Context, packages: Set<String>): Today {
        val empty = Today(packages.associateWith { 0 }, IntArray(24))
        if (packages.isEmpty()) return empty
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return empty

        val dayStart = startOfToday()
        val now = System.currentTimeMillis()
        val events = try {
            usageStatsManager.queryEvents(dayStart, now)
        } catch (_: Exception) {
            null
        } ?: return empty

        // An app can have several activities resumed in overlapping order, so
        // time runs while at least one of them is in front.
        val resumed = mutableMapOf<String, Int>()
        val since = mutableMapOf<String, Long>()
        val totals = mutableMapOf<String, Long>()
        val perHour = LongArray(24)
        val event = UsageEvents.Event()

        // Books an interval to its package and splits it over the hours it covers.
        fun add(packageName: String, start: Long, end: Long) {
            if (end <= start) return
            totals[packageName] = (totals[packageName] ?: 0L) + (end - start)
            splitIntoHours(perHour, dayStart, start, end)
        }

        // Closes every running interval at `end`. Android does not always log
        // the matching MOVE_TO_BACKGROUND (process killed, reboot); the open
        // interval then ran on until now and the daily limit locked the app
        // for time nobody spent in it.
        fun closeAll(end: Long) {
            for ((packageName, start) in since) add(packageName, start, end)
            since.clear()
            resumed.clear()
        }

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val packageName = event.packageName ?: continue

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P &&
                (event.eventType == UsageEvents.Event.DEVICE_SHUTDOWN ||
                    event.eventType == UsageEvents.Event.DEVICE_STARTUP)
            ) {
                closeAll(event.timeStamp)
                continue
            }

            if (packageName !in packages) {
                // Another app in front ends the protected one's time, whether or
                // not its own background event was logged. In split screen this
                // undercounts, which errs on the lenient side.
                if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) closeAll(event.timeStamp)
                continue
            }

            when (event.eventType) {
                UsageEvents.Event.MOVE_TO_FOREGROUND -> {
                    // Switching straight from one protected app to another.
                    if (since.keys.any { it != packageName }) closeAll(event.timeStamp)
                    val count = resumed[packageName] ?: 0
                    if (count == 0) since[packageName] = event.timeStamp
                    resumed[packageName] = count + 1
                }

                UsageEvents.Event.MOVE_TO_BACKGROUND -> {
                    val count = resumed[packageName] ?: 0
                    if (count == 0) continue
                    if (count == 1) {
                        since.remove(packageName)?.let { start -> add(packageName, start, event.timeStamp) }
                    }
                    resumed[packageName] = count - 1
                }
            }
        }

        // Still in front right now.
        for ((packageName, start) in since) add(packageName, start, now)

        return Today(
            minutes = packages.associateWith { packageName -> ((totals[packageName] ?: 0L) / 60_000L).toInt() },
            minutesPerHour = IntArray(24) { hour -> ((perHour[hour] + 30_000L) / 60_000L).toInt() },
        )
    }

    /** Local midnight `daysBack` days before today. */
    fun startOfDay(daysBack: Int): Long = Calendar.getInstance().apply {
        timeInMillis = startOfToday()
        add(Calendar.DAY_OF_YEAR, -daysBack)
    }.timeInMillis

    /** Adds the interval [start, end) to the local hours of the day that starts at `dayStart`. */
    private fun splitIntoHours(perHour: LongArray, dayStart: Long, start: Long, end: Long) {
        var from = start
        while (from < end) {
            val hour = ((from - dayStart) / 3_600_000L).toInt().coerceIn(0, 23)
            val hourEnd = minOf(end, dayStart + (hour + 1) * 3_600_000L)
            perHour[hour] += (hourEnd - from).coerceAtLeast(0L)
            if (hour == 23 && hourEnd == end) break
            from = if (hourEnd > from) hourEnd else end
        }
    }

    /**
     * A day of screen time, for "Start": the total, per local hour, per app,
     * and how often the phone was unlocked. Hours count from `from`, which
     * should be a local midnight.
     */
    class ScreenDay(
        val totalMinutes: Int,
        val minutesPerHour: IntArray,
        val minutesPerApp: Map<String, Int>,
        val unlocks: Int,
        val firstUnlockAt: Long?,
    )

    /** Total screen time between two moments in minutes; see screenDay(). */
    fun screenTimeMinutes(context: Context, from: Long, to: Long): Int = screenDay(context, from, to).totalMinutes

    /**
     * Screen time between two moments: the time any app was in front, except
     * home screens and the system UI, like Android's own Digital Wellbeing
     * counts it. Unlocks are the times the keyguard went away (Android 9 and
     * later). Nothing is stored here; only the sums are returned.
     */
    @Suppress("DEPRECATION") // MOVE_TO_* equal ACTIVITY_RESUMED/PAUSED and also cover Android 9.
    fun screenDay(context: Context, from: Long, to: Long): ScreenDay {
        val empty = ScreenDay(0, IntArray(24), emptyMap(), 0, null)
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return empty
        val events = try {
            usageStatsManager.queryEvents(from, to)
        } catch (_: Exception) {
            null
        } ?: return empty

        val excluded = homeScreenPackages(context) + setOf("com.android.systemui", "android")
        var current: String? = null
        var resumedCount = 0
        var since = 0L
        var total = 0L
        val perHour = LongArray(24)
        val perApp = mutableMapOf<String, Long>()
        var unlocks = 0
        var firstUnlockAt: Long? = null
        val event = UsageEvents.Event()

        fun close(end: Long) {
            val packageName = current
            if (packageName != null && end > since) {
                total += end - since
                perApp[packageName] = (perApp[packageName] ?: 0L) + (end - since)
                splitIntoHours(perHour, from, since, end)
            }
            current = null
            resumedCount = 0
        }

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val packageName = event.packageName ?: continue

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && event.eventType == UsageEvents.Event.KEYGUARD_HIDDEN) {
                unlocks++
                if (firstUnlockAt == null) firstUnlockAt = event.timeStamp
                continue
            }

            val endsEverything = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P &&
                (event.eventType == UsageEvents.Event.SCREEN_NON_INTERACTIVE ||
                    event.eventType == UsageEvents.Event.DEVICE_SHUTDOWN)
            if (endsEverything) {
                close(event.timeStamp)
                continue
            }

            when (event.eventType) {
                UsageEvents.Event.MOVE_TO_FOREGROUND -> {
                    if (packageName == current) {
                        resumedCount++
                    } else {
                        close(event.timeStamp)
                        if (packageName !in excluded) {
                            current = packageName
                            resumedCount = 1
                            since = event.timeStamp
                        }
                    }
                }

                UsageEvents.Event.MOVE_TO_BACKGROUND -> {
                    if (packageName == current) {
                        resumedCount--
                        if (resumedCount <= 0) close(event.timeStamp)
                    }
                }
            }
        }

        close(to)
        return ScreenDay(
            totalMinutes = (total / 60_000L).toInt(),
            minutesPerHour = IntArray(24) { hour -> ((perHour[hour] + 30_000L) / 60_000L).toInt() },
            minutesPerApp = perApp.mapValues { (_, millis) -> (millis / 60_000L).toInt() }.filterValues { it > 0 },
            unlocks = unlocks,
            firstUnlockAt = firstUnlockAt,
        )
    }

    /** The installed home screens; listed under <queries> so Android shows them. */
    private fun homeScreenPackages(context: Context): Set<String> {
        val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        return try {
            context.packageManager.queryIntentActivities(home, PackageManager.MATCH_DEFAULT_ONLY)
                .mapNotNull { it.activityInfo?.packageName }
                .toSet()
        } catch (_: Exception) {
            emptySet()
        }
    }
}
