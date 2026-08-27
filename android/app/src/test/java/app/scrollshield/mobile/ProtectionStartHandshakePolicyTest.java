package app.scrollshield.mobile;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ProtectionStartHandshakePolicyTest {
    @Test
    public void lifecycleTimestampAdvancesStrictlyBeyondKnownBoundary() {
        assertTrue(
            ProtectionStartHandshakePolicy.nextLifecycleTimestamp(100L, 120L, 110L, 115L) > 120L
        );
        assertTrue(
            ProtectionStartHandshakePolicy.nextLifecycleTimestamp(500L, 120L, 110L, 115L) >= 500L
        );
    }

    @Test
    public void freshPendingStartUsesBoundedConfirmationWindow() {
        assertTrue(
            ProtectionStartHandshakePolicy.hasFreshPendingStartRequest(
                true,
                1_000L,
                900L,
                800L,
                16_000L
            )
        );
        assertFalse(
            ProtectionStartHandshakePolicy.hasFreshPendingStartRequest(
                true,
                1_000L,
                900L,
                800L,
                16_001L
            )
        );
        assertFalse(
            ProtectionStartHandshakePolicy.hasFreshPendingStartRequest(
                false,
                1_000L,
                900L,
                800L,
                1_001L
            )
        );
    }

    @Test
    public void clockRollbackCannotHoldPendingStartForever() {
        assertTrue(
            ProtectionStartHandshakePolicy.hasFreshPendingStartRequest(
                true,
                10_000L,
                9_000L,
                8_000L,
                5_001L
            )
        );
        assertFalse(
            ProtectionStartHandshakePolicy.hasFreshPendingStartRequest(
                true,
                10_000L,
                9_000L,
                8_000L,
                4_999L
            )
        );
    }

    @Test
    public void terminalStopSupersedesDelayedConfirmation() {
        assertTrue(ProtectionStartHandshakePolicy.isConfirmationSuperseded(false, 200L, 100L));
        assertTrue(ProtectionStartHandshakePolicy.isConfirmationSuperseded(true, 200L, 200L));
        assertTrue(ProtectionStartHandshakePolicy.isConfirmationSuperseded(true, 200L, 250L));
        assertFalse(ProtectionStartHandshakePolicy.isConfirmationSuperseded(true, 200L, 150L));
    }

    @Test
    public void unconfirmedBoundaryIsSeparateFromConfirmedOrStoppedState() {
        assertTrue(
            ProtectionStartHandshakePolicy.hasUnconfirmedStartRequest(true, 300L, 200L, 250L)
        );
        assertFalse(
            ProtectionStartHandshakePolicy.hasUnconfirmedStartRequest(true, 300L, 300L, 250L)
        );
        assertFalse(
            ProtectionStartHandshakePolicy.hasUnconfirmedStartRequest(true, 300L, 200L, 300L)
        );
    }

    @Test
    public void autoRecoverySnapshotMatchesOnlyUnchangedLifecycleTruth() {
        assertTrue(
            ProtectionStartHandshakePolicy.matchesLifecycleSnapshot(
                true,
                300L,
                200L,
                250L,
                true,
                300L,
                200L,
                250L
            )
        );
        assertFalse(
            ProtectionStartHandshakePolicy.matchesLifecycleSnapshot(
                false,
                300L,
                200L,
                400L,
                true,
                300L,
                200L,
                250L
            )
        );
        assertFalse(
            ProtectionStartHandshakePolicy.matchesLifecycleSnapshot(
                true,
                301L,
                200L,
                250L,
                true,
                300L,
                200L,
                250L
            )
        );
    }
}