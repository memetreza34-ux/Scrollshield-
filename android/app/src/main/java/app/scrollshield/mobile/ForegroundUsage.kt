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

    /**
     * UsageEvents global transitions have no guaranteed packageName. Decode the
     * event type before looking at its package, especially for screen-off and
     * device shutdown: otherwise a stale activity appears active all night.
     */
    @Suppress("DEPRECATION") // MOVE_TO_* aliases ACTIVITY_RESUMED/PAUSED since Android P.
    private fun decodeObservation(event: UsageEvents.Event): UsageObservation? {
        val signal = when (event.eventType) {
            UsageEvents.Event.MOVE_TO_FOREGROUND -> UsageSignal.FOREGROUND
            UsageEvents.Event.MOVE_TO_BACKGROUND -> UsageSignal.BACKGROUND
            UsageEvents.Event.SCREEN_NON_INTERACTIVE ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) UsageSignal.SCREEN_OFF else return null
            UsageEvents.Event.DEVICE_SHUTDOWN ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) UsageSignal.DEVICE_SHUTDOWN else return null
            UsageEvents.Event.DEVICE_STARTUP ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) UsageSignal.DEVICE_STARTUP else return null
            else -> return null
        }
        return UsageObservation(event.timeStamp, event.packageName, signal)
    }

    /** Minutes per protected package since local midnight; 0 when unused. */
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

        val accumulator = ProtectedUsageAccumulator(packages)
        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            decodeObservation(event)?.let(accumulator::accept)
        }
        return accumulator.minutesAt(now)
    }

    /** Local midnight `daysBack` days before today. */
    fun startOfDay(daysBack: Int): Long = Calendar.getInstance().apply {
        timeInMillis = startOfToday()
        add(Calendar.DAY_OF_YEAR, -daysBack)
    }.timeInMillis

    /**
     * Total screen time between two moments, excluding home screens and
     * system UI. Screen-off events terminate open intervals even if Android
     * does not supply a package name or matching activity background event.
     */
    fun screenTimeMinutes(context: Context, from: Long, to: Long): Int {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return 0
        val events = try {
            usageStatsManager.queryEvents(from, to)
        } catch (_: Exception) {
            null
        } ?: return 0

        val excluded = homeScreenPackages(context) + setOf("com.android.systemui", "android")
        val accumulator = ScreenTimeAccumulator(excluded)
        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            decodeObservation(event)?.let(accumulator::accept)
        }
        return accumulator.minutesAt(to)
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
