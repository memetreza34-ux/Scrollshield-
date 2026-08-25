package app.scrollshield.mobile;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

public class ProtectionServiceDispatchGuardTest {
    @Before
    public void setUp() {
        ProtectionServiceDispatchGuard.resetForTest();
    }

    @After
    public void tearDown() {
        ProtectionServiceDispatchGuard.resetForTest();
    }

    @Test
    public void successfulControlledStopIsConsumedExactlyOnceByDestroy() {
        assertFalse(ProtectionServiceDispatchGuard.hasControlledStopAwaitingDestroyForTest());

        ProtectionServiceDispatchGuard.noteControlledStopDispatched(true);
        assertTrue(ProtectionServiceDispatchGuard.hasControlledStopAwaitingDestroyForTest());
        assertTrue(ProtectionServiceDispatchGuard.consumeControlledStopDestroy());
        assertFalse(ProtectionServiceDispatchGuard.consumeControlledStopDestroy());
        assertFalse(ProtectionServiceDispatchGuard.hasControlledStopAwaitingDestroyForTest());
    }

    @Test
    public void failedStopDispatchDoesNotSuppressFutureUnexpectedDestroy() {
        ProtectionServiceDispatchGuard.noteControlledStopDispatched(false);

        assertFalse(ProtectionServiceDispatchGuard.hasControlledStopAwaitingDestroyForTest());
        assertFalse(ProtectionServiceDispatchGuard.consumeControlledStopDestroy());
    }
}
