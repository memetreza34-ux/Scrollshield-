package app.scrollshield.mobile

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class UsageTimeAccumulatorTest {
    private fun event(minute: Long, packageName: String?, signal: UsageSignal) =
        UsageObservation(minute * 60_000L, packageName, signal)

    @Test
    fun screenOffClosesProtectedIntervalEvenWithoutPackageName() {
        val usage = ProtectedUsageAccumulator(setOf("instagram"))
        usage.accept(event(0, "instagram", UsageSignal.FOREGROUND))
        usage.accept(event(10, null, UsageSignal.SCREEN_OFF))

        // The screen remained dark until minute 180, not 180 minutes of usage.
        assertEquals(10, usage.minutesAt(180 * 60_000L).getValue("instagram"))

        usage.accept(event(180, "instagram", UsageSignal.FOREGROUND))
        usage.accept(event(185, "instagram", UsageSignal.BACKGROUND))
        assertEquals(15, usage.minutesAt(190 * 60_000L).getValue("instagram"))
    }

    @Test
    fun deviceShutdownAndStartupWithNullPackageCannotAccruePhantomTime() {
        val usage = ProtectedUsageAccumulator(setOf("instagram"))
        usage.accept(event(0, "instagram", UsageSignal.FOREGROUND))
        usage.accept(event(3, null, UsageSignal.DEVICE_SHUTDOWN))
        usage.accept(event(100, null, UsageSignal.DEVICE_STARTUP))
        assertEquals(3, usage.minutesAt(180 * 60_000L).getValue("instagram"))
    }

    @Test
    fun switchingBetweenProtectedAppsAndHomeClosesOldIntervals() {
        val usage = ProtectedUsageAccumulator(setOf("instagram", "tiktok"))
        usage.accept(event(0, "instagram", UsageSignal.FOREGROUND))
        usage.accept(event(4, "tiktok", UsageSignal.FOREGROUND))
        usage.accept(event(6, "home", UsageSignal.FOREGROUND))
        assertEquals(4, usage.minutesAt(60 * 60_000L).getValue("instagram"))
        assertEquals(2, usage.minutesAt(60 * 60_000L).getValue("tiktok"))
    }

    @Test
    fun nestedActivityResumesCloseAtLastMatchingBackground() {
        val usage = ProtectedUsageAccumulator(setOf("instagram"))
        usage.accept(event(0, "instagram", UsageSignal.FOREGROUND))
        usage.accept(event(2, "instagram", UsageSignal.FOREGROUND))
        usage.accept(event(4, "instagram", UsageSignal.BACKGROUND))
        usage.accept(event(8, "instagram", UsageSignal.BACKGROUND))
        assertEquals(8, usage.minutesAt(30 * 60_000L).getValue("instagram"))
    }

    @Test
    fun nullPackageScreenOffClosesOverallScreenTimeAndHomeDoesNotCount() {
        val usage = ScreenTimeAccumulator(setOf("home", "com.android.systemui"))
        usage.accept(event(0, "instagram", UsageSignal.FOREGROUND))
        usage.accept(event(10, null, UsageSignal.SCREEN_OFF))
        assertEquals(10, usage.minutesAt(180 * 60_000L))
        usage.accept(event(180, "home", UsageSignal.FOREGROUND))
        usage.accept(event(184, "tiktok", UsageSignal.FOREGROUND))
        usage.accept(event(188, "tiktok", UsageSignal.BACKGROUND))
        assertEquals(14, usage.minutesAt(200 * 60_000L))
    }

    @Test
    fun screenTimeClosesOnNullPackageShutdownAndDoesNotDoubleCountOnRead() {
        val usage = ScreenTimeAccumulator(emptySet())
        usage.accept(event(0, "instagram", UsageSignal.FOREGROUND))
        usage.accept(event(2, null, UsageSignal.DEVICE_SHUTDOWN))
        assertEquals(2, usage.minutesAt(120 * 60_000L))
        assertEquals(2, usage.minutesAt(120 * 60_000L))
    }

    @Test
    fun malformedTimeReversalNeverProducesNegativeMinutes() {
        val usage = ProtectedUsageAccumulator(setOf("instagram"))
        usage.accept(event(10, "instagram", UsageSignal.FOREGROUND))
        usage.accept(event(5, null, UsageSignal.SCREEN_OFF))
        assertEquals(0, usage.minutesAt(30 * 60_000L).getValue("instagram"))
    }

    @Test
    fun emptyProtectedSetCannotGenerateUsage() {
        val usage = ProtectedUsageAccumulator(emptySet())
        usage.accept(event(0, "instagram", UsageSignal.FOREGROUND))
        assertTrue(usage.minutesAt(60 * 60_000L).isEmpty())
    }
}
