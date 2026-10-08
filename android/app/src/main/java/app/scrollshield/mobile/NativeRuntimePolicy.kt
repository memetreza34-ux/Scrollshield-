package app.scrollshield.mobile

import java.util.Calendar

/**
 * Pure, Android-independent decisions used by the foreground monitor.
 *
 * Keeping these here makes hour-boundary and session-limit behavior testable
 * without launching an Android service or faking UsageStatsManager.
 */
internal data class HourWindow(val startHour: Int, val endHour: Int)

internal object NativeRuntimePolicy {
    /**
     * Mirrors src/lib/schedules.ts: start is inclusive, end exclusive.
     * Equal start/end means disabled, not a 24-hour lock. End 24 is allowed.
     */
    fun isHourInWindow(hour: Int, startHour: Int, endHour: Int): Boolean {
        if (hour !in 0..23 || startHour !in 0..23 || endHour !in 0..24 || startHour == endHour) {
            return false
        }
        return if (startHour < endHour) {
            hour >= startHour && hour < endHour
        } else {
            hour >= startHour || hour < endHour
        }
    }

    fun isScheduleLocked(
        hour: Int,
        dayOfWeek: Int,
        windows: List<HourWindow>,
        weekendRule: String,
    ): Boolean {
        if (windows.any { isHourInWindow(hour, it.startHour, it.endHour) }) return true
        val weekend = dayOfWeek == Calendar.SATURDAY || dayOfWeek == Calendar.SUNDAY
        return weekend && weekendRule in setOf("strict", "block")
    }

    /**
     * A session begins when Continue is accepted, not when the app first
     * enters foreground behind an interruption overlay. On lock or screen-off
     * its start is reset separately by the service.
     */
    fun shouldInterruptSession(startedAt: Long?, now: Long, limitMinutes: Int): Boolean {
        if (startedAt == null || limitMinutes <= 0 || now < startedAt) return false
        return now - startedAt >= limitMinutes.toLong() * 60_000L
    }

    /**
     * Overlays are created on the main thread after a worker-thread decision.
     * A fast app switch in between must not show an obsolete interruption.
     */
    fun shouldPresentOverlay(
        targetPackage: String,
        currentForegroundPackage: String?,
        isProtected: Boolean,
        monitoringEnabled: Boolean,
        screenInteractive: Boolean,
    ): Boolean =
        targetPackage.isNotBlank() &&
            targetPackage == currentForegroundPackage &&
            isProtected &&
            monitoringEnabled &&
            screenInteractive

}
