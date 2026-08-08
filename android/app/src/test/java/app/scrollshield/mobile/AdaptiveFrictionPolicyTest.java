package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class AdaptiveFrictionPolicyTest {
    @Test
    public void disabledKeepsBaseDelay() {
        assertEquals(10, AdaptiveFrictionPolicy.resolveDelaySeconds(false, 10, 8, 3));
        assertFalse(AdaptiveFrictionPolicy.isEscalated(false, 10, 8, 3));
    }

    @Test
    public void belowWarningThresholdKeepsBaseDelay() {
        assertEquals(10, AdaptiveFrictionPolicy.resolveDelaySeconds(true, 10, 2, 3));
        assertFalse(AdaptiveFrictionPolicy.isEscalated(true, 10, 2, 3));
    }

    @Test
    public void warningThresholdStartsProgressiveDelay() {
        assertEquals(15, AdaptiveFrictionPolicy.resolveDelaySeconds(true, 10, 3, 3));
        assertEquals(20, AdaptiveFrictionPolicy.resolveDelaySeconds(true, 10, 4, 3));
        assertTrue(AdaptiveFrictionPolicy.isEscalated(true, 10, 4, 3));
    }

    @Test
    public void progressiveDelayIsCappedAtSixtySeconds() {
        assertEquals(60, AdaptiveFrictionPolicy.resolveDelaySeconds(true, 10, 20, 3));
    }

    @Test
    public void policyNeverReducesAnExistingLongerBaseDelay() {
        assertEquals(90, AdaptiveFrictionPolicy.resolveDelaySeconds(true, 90, 20, 3));
    }

    @Test
    public void malformedNegativeInputsAreSafelyBounded() {
        assertEquals(0, AdaptiveFrictionPolicy.resolveDelaySeconds(true, -10, -4, 3));
        assertEquals(0, AdaptiveFrictionPolicy.resolveDelaySeconds(true, -10, 4, 0));
    }
}
