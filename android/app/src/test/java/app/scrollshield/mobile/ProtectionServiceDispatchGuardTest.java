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
    public void successfulControlledStopIsConsumedExactlyOnceByPromptDestroy() {
        assertFalse(ProtectionServiceDispatchGuard.hasControlledStopAwaitingDestroyForTest());

        long stopNanos = 100L;
        ProtectionServiceDispatchGuard.noteControlledStopDispatched(true, stopNanos);
        assertTrue(ProtectionServiceDispatchGuard.hasControlledStopAwaitingDestroyForTest());
        assertTrue(
            ProtectionServiceDispatchGuard.consumeControlledStopDestroy(
                stopNanos + ProtectionServiceDispatchGuard.CONTROLLED_STOP_DESTROY_WINDOW_NANOS
            )
        );
        assertFalse(ProtectionServiceDispatchGuard.consumeControlledStopDestroy(stopNanos + 1L));
        assertFalse(ProtectionServiceDispatchGuard.hasControlledStopAwaitingDestroyForTest());
    }

    @Test
    public void staleControlledStopTokenCannotSuppressLaterUnexpectedDestroy() {
        long stopNanos = 1_000L;
        ProtectionServiceDispatchGuard.noteControlledStopDispatched(true, stopNanos);

        assertFalse(
            ProtectionServiceDispatchGuard.consumeControlledStopDestroy(
                stopNanos + ProtectionServiceDispatchGuard.CONTROLLED_STOP_DESTROY_WINDOW_NANOS + 1L
            )
        );
        assertFalse(ProtectionServiceDispatchGuard.hasControlledStopAwaitingDestroyForTest());
    }

    @Test
    public void backwardMonotonicInputFailsSafeInsteadOfSuppressingDestroy() {
        ProtectionServiceDispatchGuard.noteControlledStopDispatched(true, 2_000L);

        assertFalse(ProtectionServiceDispatchGuard.consumeControlledStopDestroy(1_999L));
    }

    @Test
    public void failedStopDispatchDoesNotSuppressFutureUnexpectedDestroy() {
        ProtectionServiceDispatchGuard.noteControlledStopDispatched(false, 100L);

        assertFalse(ProtectionServiceDispatchGuard.hasControlledStopAwaitingDestroyForTest());
        assertFalse(ProtectionServiceDispatchGuard.consumeControlledStopDestroy(101L));
    }
}
