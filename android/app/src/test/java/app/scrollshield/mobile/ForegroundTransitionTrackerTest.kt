package app.scrollshield.mobile

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ForegroundTransitionTrackerTest {
    private fun resume(at: Long, pkg: String?) =
        ForegroundTransition(at, ForegroundTransitionKind.RESUMED, pkg)

    private fun pause(at: Long, pkg: String?) =
        ForegroundTransition(at, ForegroundTransitionKind.PAUSED, pkg)

    @Test
    fun resumesAndSwitchesBetweenProtectedApps() {
        val tracker = ForegroundTransitionTracker()
        tracker.accept(resume(100, "instagram"))
        assertEquals("instagram", tracker.currentPackage)
        tracker.accept(resume(200, "tiktok"))
        assertEquals("tiktok", tracker.currentPackage)
    }

    @Test
    fun pausedAppWithoutNewResumeHasNoForegroundPackage() {
        val tracker = ForegroundTransitionTracker()
        tracker.accept(resume(100, "instagram"))
        tracker.accept(pause(200, "instagram"))
        assertNull(tracker.currentPackage)
    }

    @Test
    fun pausedPreviousAppDoesNotHideTheCurrentOne() {
        val tracker = ForegroundTransitionTracker()
        tracker.accept(resume(100, "instagram"))
        tracker.accept(resume(200, "tiktok"))
        tracker.accept(pause(300, "instagram"))
        assertEquals("tiktok", tracker.currentPackage)
    }

    @Test
    fun overlappingUsageEventQueriesDoNotReplayOldForegroundTransitions() {
        val tracker = ForegroundTransitionTracker()
        val events = listOf(
            resume(100, "instagram"),
            pause(200, "instagram"),
            resume(300, "tiktok"),
        )
        events.forEach(tracker::accept)
        events.forEach(tracker::accept) // next 1.5 s poll includes same events
        assertEquals("tiktok", tracker.currentPackage)
    }

    @Test
    fun resetOnLockCannotResurrectPreviousResumeFromOverlappingWindow() {
        val tracker = ForegroundTransitionTracker()
        tracker.accept(resume(100, "instagram"))
        tracker.resetCurrent()
        tracker.accept(resume(100, "instagram")) // stale event still in query window
        assertNull(tracker.currentPackage)
        tracker.accept(resume(200, "instagram"))
        assertEquals("instagram", tracker.currentPackage)
    }

    @Test
    fun explicitScreenOffAndShutdownEventsCloseCurrentSession() {
        val tracker = ForegroundTransitionTracker()
        tracker.accept(resume(100, "instagram"))
        tracker.accept(ForegroundTransition(200, ForegroundTransitionKind.SCREEN_OFF))
        assertNull(tracker.currentPackage)
        tracker.accept(resume(300, "instagram"))
        tracker.accept(ForegroundTransition(400, ForegroundTransitionKind.DEVICE_SHUTDOWN))
        assertNull(tracker.currentPackage)
    }

    @Test
    fun deviceStartupAndNullPackageGlobalEventsAreHandled() {
        val tracker = ForegroundTransitionTracker()
        tracker.accept(resume(100, "instagram"))
        tracker.accept(ForegroundTransition(200, ForegroundTransitionKind.DEVICE_STARTUP))
        assertNull(tracker.currentPackage)
        tracker.accept(resume(300, "tiktok"))
        assertEquals("tiktok", tracker.currentPackage)
    }

    @Test
    fun oldEventsCannotReplaceNewerState() {
        val tracker = ForegroundTransitionTracker()
        tracker.accept(resume(300, "tiktok"))
        tracker.accept(pause(200, "tiktok"))
        tracker.accept(resume(100, "instagram"))
        assertEquals("tiktok", tracker.currentPackage)
    }

    @Test
    fun multipleKindsAtSameTimestampAreProcessedOnce() {
        val tracker = ForegroundTransitionTracker()
        tracker.accept(resume(100, "instagram"))
        tracker.accept(pause(100, "instagram"))
        tracker.accept(pause(100, "instagram")) // duplicate second poll
        assertNull(tracker.currentPackage)
        tracker.accept(resume(100, "tiktok"))
        assertEquals("tiktok", tracker.currentPackage)
    }

    @Test
    fun malformedNullAndBlankPackageEventsAreIgnored() {
        val tracker = ForegroundTransitionTracker()
        tracker.accept(resume(100, "instagram"))
        tracker.accept(pause(200, null))
        tracker.accept(resume(300, " "))
        assertEquals("instagram", tracker.currentPackage)
    }

    @Test
    fun manualClockRollbackRecoversNewEventsWithoutReplayingOldState() {
        val tracker = ForegroundTransitionTracker()
        tracker.accept(resume(20_000, "instagram"))
        tracker.reconcileWallClock(10_000)
        assertNull(tracker.currentPackage)
        tracker.accept(resume(9_900, "tiktok"))
        assertEquals("tiktok", tracker.currentPackage)
    }

    @Test
    fun stableClockKeepsTheLastKnownForegroundWhenNoNewEventArrives() {
        val tracker = ForegroundTransitionTracker()
        tracker.accept(resume(10_000, "instagram"))
        tracker.reconcileWallClock(11_000)
        assertEquals("instagram", tracker.currentPackage)
    }

    @Test
    fun homeAndScrollShieldAreNormalForegroundTransitions() {
        val tracker = ForegroundTransitionTracker()
        tracker.accept(resume(100, "instagram"))
        tracker.accept(resume(200, "com.android.launcher"))
        assertEquals("com.android.launcher", tracker.currentPackage)
        tracker.accept(resume(300, "app.scrollshield.mobile"))
        assertEquals("app.scrollshield.mobile", tracker.currentPackage)
    }
}
