package app.scrollshield.mobile

import org.junit.Assert.assertEquals
import org.junit.Test

class OpenWindowPolicyTest {
    @Test
    fun emptyHistoryAndDisabledWindowsAreSafe() {
        assertEquals(0, OpenWindowPolicy.countPreviousOpenings(emptyList(), 100_000L, 20))
        assertEquals(0, OpenWindowPolicy.countPreviousOpenings(listOf(90_000L), 100_000L, 0))
        assertEquals(0, OpenWindowPolicy.countPreviousOpenings(listOf(90_000L), 100_000L, -2))
    }

    @Test
    fun countsOnlyPreviousOpeningsInsideTheConfiguredWindow() {
        val now = 3_000_000L
        val history = listOf(now - 2_000_000L, now - 60_000L, now - 1_000L)
        assertEquals(2, OpenWindowPolicy.countPreviousOpenings(history, now, 20))
    }

    @Test
    fun excludesAnOpeningExactlyAtTheLowerBoundary() {
        val now = 2_000_000L
        assertEquals(
            1,
            OpenWindowPolicy.countPreviousOpenings(listOf(now - 20 * 60_000L, now - 20 * 60_000L + 1), now, 20),
        )
    }

    @Test
    fun excludesFutureTimestampsAfterClockRollback() {
        val now = 1_000_000L
        val history = listOf(now - 100L, now + 1L, now + 60_000L, now + 3_600_000L)
        assertEquals(1, OpenWindowPolicy.countPreviousOpenings(history, now, 30))
    }

    @Test
    fun countsOpeningAtTheCurrentTimestamp() {
        assertEquals(1, OpenWindowPolicy.countPreviousOpenings(listOf(1_000_001L, 1_000_000L), 1_000_000L, 1))
    }

    @Test
    fun usesLongArithmeticForLongWindowDurations() {
        val now = 5_000_000_000L
        assertEquals(1, OpenWindowPolicy.countPreviousOpenings(listOf(now - 1_000L), now, 1_440))
    }
}
