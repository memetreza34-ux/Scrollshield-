package app.scrollshield.mobile

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class EmergencyGrantPolicyTest {
    @Test
    fun firstUnlockIsAllowedWhenQuotaRemains() {
        assertTrue(EmergencyGrantPolicy.canGrant(0, 2, 5))
    }

    @Test
    fun lastAvailableGrantIsAllowedButNextIsRejected() {
        assertTrue(EmergencyGrantPolicy.canGrant(1, 2, 5))
        assertFalse(EmergencyGrantPolicy.canGrant(2, 2, 5))
        assertFalse(EmergencyGrantPolicy.canGrant(3, 2, 5))
    }

    @Test
    fun invalidImportedQuotaCannotCreateUnlimitedUnlocks() {
        assertFalse(EmergencyGrantPolicy.canGrant(0, 0, 5))
        assertFalse(EmergencyGrantPolicy.canGrant(0, 21, 5))
        assertFalse(EmergencyGrantPolicy.canGrant(-1, 2, 5))
    }

    @Test
    fun invalidImportedDurationIsRejected() {
        assertFalse(EmergencyGrantPolicy.canGrant(0, 2, 0))
        assertFalse(EmergencyGrantPolicy.canGrant(0, 2, 61))
    }

    @Test
    fun persistedExpiryIsIndependentOfProcessUptime() {
        val epoch = 1_800_000_000_000L
        val until = EmergencyGrantPolicy.expiresAt(epoch, 5)
        assertEquals(epoch + 300_000L, until)
        assertTrue(EmergencyGrantPolicy.isActive(until, epoch + 1L))
        assertTrue(EmergencyGrantPolicy.isActive(until, until - 1L))
        assertFalse(EmergencyGrantPolicy.isActive(until, until))
        assertFalse(EmergencyGrantPolicy.isActive(until, until + 1L))
    }

    @Test
    fun zeroAndCorruptExpiryAreNeverRestored() {
        assertFalse(EmergencyGrantPolicy.isActive(0L, 1L))
        assertFalse(EmergencyGrantPolicy.isActive(-1L, 1L))
    }
}
