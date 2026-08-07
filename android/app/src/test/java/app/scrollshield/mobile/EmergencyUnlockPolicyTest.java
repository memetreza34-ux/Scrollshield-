package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class EmergencyUnlockPolicyTest {
    @Test
    public void requiresIntentionalReasonOnlyWhenConfigured() {
        assertFalse(EmergencyUnlockPolicy.isReasonSatisfied(true, ""));
        assertFalse(EmergencyUnlockPolicy.isReasonSatisfied(true, "ok"));
        assertTrue(EmergencyUnlockPolicy.isReasonSatisfied(true, "Arbeit"));
        assertTrue(EmergencyUnlockPolicy.isReasonSatisfied(false, ""));
    }

    @Test
    public void normalizesAndBoundsLocalReasonText() {
        assertEquals("Wichtiger Anruf", EmergencyUnlockPolicy.normalizeReason("  Wichtiger\n\tAnruf  "));

        String oversized = "a".repeat(EmergencyUnlockPolicy.MAX_REASON_CHARACTERS + 20);
        assertEquals(
            EmergencyUnlockPolicy.MAX_REASON_CHARACTERS,
            EmergencyUnlockPolicy.normalizeReason(oversized).length()
        );
    }

    @Test
    public void strictEmergencyUsesExtraCountdownOnlyWhenRequested() {
        assertEquals(30, EmergencyUnlockPolicy.resolveCountdownSeconds(true, true, true, 5));
        assertEquals(5, EmergencyUnlockPolicy.resolveCountdownSeconds(true, true, false, 5));
        assertEquals(30, EmergencyUnlockPolicy.resolveCountdownSeconds(true, false, false, 5));
        assertEquals(10, EmergencyUnlockPolicy.resolveCountdownSeconds(false, false, true, 10));
    }

    @Test
    public void unlockRequiresAvailabilityCountdownAndOptionalReason() {
        assertTrue(EmergencyUnlockPolicy.canEmergencyUnlock(true, true, true, "Arbeit"));
        assertFalse(EmergencyUnlockPolicy.canEmergencyUnlock(false, true, true, "Arbeit"));
        assertFalse(EmergencyUnlockPolicy.canEmergencyUnlock(true, false, true, "Arbeit"));
        assertFalse(EmergencyUnlockPolicy.canEmergencyUnlock(true, true, true, ""));
        assertTrue(EmergencyUnlockPolicy.canEmergencyUnlock(true, true, false, ""));
    }
}
