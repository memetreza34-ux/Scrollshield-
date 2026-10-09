package app.scrollshield.mobile

import java.util.Calendar
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeRuntimePolicyTest {
    @Test
    fun daytimeWindowIsStartInclusiveEndExclusive() {
        assertFalse(NativeRuntimePolicy.isHourInWindow(8, 9, 17))
        assertTrue(NativeRuntimePolicy.isHourInWindow(9, 9, 17))
        assertTrue(NativeRuntimePolicy.isHourInWindow(16, 9, 17))
        assertFalse(NativeRuntimePolicy.isHourInWindow(17, 9, 17))
    }

    @Test
    fun overnightWindowWorksAcrossMidnight() {
        assertFalse(NativeRuntimePolicy.isHourInWindow(20, 21, 7))
        assertTrue(NativeRuntimePolicy.isHourInWindow(21, 21, 7))
        assertTrue(NativeRuntimePolicy.isHourInWindow(23, 21, 7))
        assertTrue(NativeRuntimePolicy.isHourInWindow(0, 21, 7))
        assertTrue(NativeRuntimePolicy.isHourInWindow(6, 21, 7))
        assertFalse(NativeRuntimePolicy.isHourInWindow(7, 21, 7))
    }

    @Test
    fun equalHoursDisableWindowRatherThanLockAllDay() {
        for (hour in 0..23) {
            assertFalse(NativeRuntimePolicy.isHourInWindow(hour, 0, 0))
            assertFalse(NativeRuntimePolicy.isHourInWindow(hour, 12, 12))
        }
    }

    @Test
    fun endOfDay24IsValid() {
        assertFalse(NativeRuntimePolicy.isHourInWindow(21, 22, 24))
        assertTrue(NativeRuntimePolicy.isHourInWindow(22, 22, 24))
        assertTrue(NativeRuntimePolicy.isHourInWindow(23, 22, 24))
        assertTrue(NativeRuntimePolicy.isHourInWindow(23, 0, 24))
    }

    @Test
    fun malformedHourDataCannotCreateAFullDayLock() {
        assertFalse(NativeRuntimePolicy.isHourInWindow(10, -1, 12))
        assertFalse(NativeRuntimePolicy.isHourInWindow(10, 10, 25))
        assertFalse(NativeRuntimePolicy.isHourInWindow(24, 0, 24))
        assertFalse(NativeRuntimePolicy.isHourInWindow(10, 24, 2))
    }

    @Test
    fun secondActiveWindowLocksEvenIfFirstDoesNot() {
        val windows = listOf(HourWindow(8, 9), HourWindow(21, 7))
        assertTrue(NativeRuntimePolicy.isScheduleLocked(22, Calendar.WEDNESDAY, windows, "normal"))
        assertFalse(NativeRuntimePolicy.isScheduleLocked(10, Calendar.WEDNESDAY, windows, "normal"))
    }

    @Test
    fun weekendBlockWorksWithoutAWindow() {
        assertFalse(NativeRuntimePolicy.isScheduleLocked(12, Calendar.FRIDAY, emptyList(), "block"))
        assertTrue(NativeRuntimePolicy.isScheduleLocked(12, Calendar.SATURDAY, emptyList(), "block"))
        assertTrue(NativeRuntimePolicy.isScheduleLocked(12, Calendar.SUNDAY, emptyList(), "strict"))
    }

    @Test
    fun unknownWeekendModeMustNotLock() {
        assertFalse(NativeRuntimePolicy.isScheduleLocked(12, Calendar.SUNDAY, emptyList(), "garbage"))
        assertFalse(NativeRuntimePolicy.isScheduleLocked(12, Calendar.SUNDAY, emptyList(), "normal"))
    }

    @Test
    fun noSessionStartMeansNoInterruption() {
        assertFalse(NativeRuntimePolicy.shouldInterruptSession(null, 60_000L, 1))
    }

    @Test
    fun disabledSessionGuardNeverInterrupts() {
        assertFalse(NativeRuntimePolicy.shouldInterruptSession(0L, 10_000_000L, 0))
        assertFalse(NativeRuntimePolicy.shouldInterruptSession(0L, 10_000_000L, -1))
    }

    @Test
    fun sessionInterruptionOccursExactlyAtTheDeadline() {
        val acceptedAt = 60_000L
        assertFalse(NativeRuntimePolicy.shouldInterruptSession(acceptedAt, acceptedAt + 599_999L, 10))
        assertTrue(NativeRuntimePolicy.shouldInterruptSession(acceptedAt, acceptedAt + 600_000L, 10))
    }

    @Test
    fun restartingTheSessionAfterContinueResetsTheDeadline() {
        val firstAccept = 1_000_000L
        val nextAccept = firstAccept + 600_000L
        assertTrue(NativeRuntimePolicy.shouldInterruptSession(firstAccept, nextAccept, 10))
        assertFalse(NativeRuntimePolicy.shouldInterruptSession(nextAccept, nextAccept + 1_000L, 10))
    }

    @Test
    fun clockRollbackDoesNotTriggerSessionGuard() {
        assertFalse(NativeRuntimePolicy.shouldInterruptSession(120_000L, 30_000L, 1))
    }

    @Test
    fun largeSessionLimitUsesLongArithmetic() {
        val start = 1_000_000L
        assertFalse(NativeRuntimePolicy.shouldInterruptSession(start, start + 1_439L * 60_000L, 1_440))
        assertTrue(NativeRuntimePolicy.shouldInterruptSession(start, start + 1_440L * 60_000L, 1_440))
    }


    @Test
    fun pendingOverlayIsDroppedAfterSwitchingToAnotherApp() {
        assertFalse(NativeRuntimePolicy.shouldPresentOverlay(
            "com.instagram.android", "com.google.android.youtube",
            isProtected = true, monitoringEnabled = true, screenInteractive = true,
        ))
    }

    @Test
    fun pendingOverlayIsDroppedWhenProtectionStopsOrScreenLocks() {
        assertFalse(NativeRuntimePolicy.shouldPresentOverlay(
            "com.instagram.android", "com.instagram.android",
            isProtected = true, monitoringEnabled = false, screenInteractive = true,
        ))
        assertFalse(NativeRuntimePolicy.shouldPresentOverlay(
            "com.instagram.android", "com.instagram.android",
            isProtected = true, monitoringEnabled = true, screenInteractive = false,
        ))
    }

    @Test
    fun onlyCurrentProtectedForegroundAppMayShowIntervention() {
        assertTrue(NativeRuntimePolicy.shouldPresentOverlay(
            "com.instagram.android", "com.instagram.android",
            isProtected = true, monitoringEnabled = true, screenInteractive = true,
        ))
        assertFalse(NativeRuntimePolicy.shouldPresentOverlay(
            "com.instagram.android", "com.instagram.android",
            isProtected = false, monitoringEnabled = true, screenInteractive = true,
        ))
    }

    @Test
    fun emergencyExpiryUsesEpochMillisNotElapsedRealtime() {
        val wallNow = 1_800_000_000_000L
        val until = wallNow + 5 * 60_000L
        val deviceUptime = 12_000_000L
        assertTrue(NativeRuntimePolicy.isEmergencyUnlockActive(until, wallNow))
        assertFalse(NativeRuntimePolicy.isEmergencyUnlockActive(until, until))
        assertFalse(NativeRuntimePolicy.isEmergencyUnlockActive(until, until + 1))
        // An expired emergency release must not be considered active
        // just because Android elapsedRealtime() is far smaller than epoch time.
        assertFalse(NativeRuntimePolicy.isEmergencyUnlockActive(until, wallNow + 10 * 60_000L))
        assertFalse(NativeRuntimePolicy.isEmergencyUnlockActive(null, deviceUptime))
        assertFalse(NativeRuntimePolicy.isEmergencyUnlockActive(0L, deviceUptime))
    }

}
