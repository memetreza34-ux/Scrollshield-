package app.scrollshield.mobile

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReopenPolicyTest {
    @Test
    fun contractVersionIsExplicit() {
        assertEquals(1, ProtectionContract.VERSION)
        assertTrue(ProtectionContract.isSupported(1))
        assertFalse(ProtectionContract.isSupported(0))
        assertFalse(ProtectionContract.isSupported(2))
    }

    @Test
    fun firstOpenUsesBaseDelay() {
        val result = ReopenPolicy.decide(
            warningOpenCount = 0,
            blockOpenCount = 0,
            warningThreshold = 2,
            blockThreshold = 5,
            baseDelaySeconds = 5,
            escalationSeconds = 5,
            maxDelaySeconds = 120,
        )

        assertFalse(result.blocked)
        assertFalse(result.warning)
        assertEquals(5, result.delaySeconds)
    }

    @Test
    fun repeatedOpenEscalatesDelay() {
        val result = ReopenPolicy.decide(
            warningOpenCount = 2,
            blockOpenCount = 2,
            warningThreshold = 2,
            blockThreshold = 5,
            baseDelaySeconds = 5,
            escalationSeconds = 5,
            maxDelaySeconds = 120,
        )

        assertFalse(result.blocked)
        assertTrue(result.warning)
        assertEquals(15, result.delaySeconds)
    }

    @Test
    fun escalationIsBounded() {
        val result = ReopenPolicy.decide(
            warningOpenCount = 50,
            blockOpenCount = 4,
            warningThreshold = 2,
            blockThreshold = 5,
            baseDelaySeconds = 30,
            escalationSeconds = 30,
            maxDelaySeconds = 120,
        )

        assertEquals(120, result.delaySeconds)
    }

    @Test
    fun blockThresholdWinsOverWarning() {
        val result = ReopenPolicy.decide(
            warningOpenCount = 5,
            blockOpenCount = 5,
            warningThreshold = 2,
            blockThreshold = 5,
            baseDelaySeconds = 5,
            escalationSeconds = 5,
            maxDelaySeconds = 120,
        )

        assertTrue(result.blocked)
        assertFalse(result.warning)
    }
}
