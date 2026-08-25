package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ProtectionServiceLifecyclePolicyTest {
    @Test
    public void exposesStableTerminalStopCodes() {
        assertEquals(
            "manual_app_stop",
            ProtectionServiceLifecyclePolicy.MANUAL_APP_STOP_CODE
        );
        assertEquals(
            "notification_action_stop",
            ProtectionServiceLifecyclePolicy.NOTIFICATION_ACTION_STOP_CODE
        );
        assertEquals(
            "unexpected_service_destroy",
            ProtectionServiceLifecyclePolicy.UNEXPECTED_SERVICE_DESTROY_CODE
        );
    }

    @Test
    public void notificationStopIsAcceptedOnlyForCurrentLifecycleGeneration() {
        assertTrue(
            ProtectionServiceLifecyclePolicy.isCurrentNotificationStopGeneration(
                300L,
                300L,
                300L
            )
        );
        assertFalse(
            ProtectionServiceLifecyclePolicy.isCurrentNotificationStopGeneration(
                0L,
                300L,
                300L
            )
        );
        assertFalse(
            ProtectionServiceLifecyclePolicy.isCurrentNotificationStopGeneration(
                200L,
                300L,
                300L
            )
        );
        assertFalse(
            ProtectionServiceLifecyclePolicy.isCurrentNotificationStopGeneration(
                300L,
                300L,
                400L
            )
        );
    }

    @Test
    public void recordsUnexpectedDestroyOnlyForCurrentConfirmedActivation() {
        assertTrue(
            ProtectionServiceLifecyclePolicy.shouldRecordUnexpectedDestroy(
                true,
                false,
                200L,
                200L,
                250L,
                100L
            )
        );
        assertFalse(
            ProtectionServiceLifecyclePolicy.shouldRecordUnexpectedDestroy(
                false,
                false,
                200L,
                200L,
                250L,
                100L
            )
        );
    }

    @Test
    public void explicitStopWithoutNewConfirmedGenerationSuppressesUnexpectedDestroy() {
        assertFalse(
            ProtectionServiceLifecyclePolicy.shouldRecordUnexpectedDestroy(
                true,
                true,
                200L,
                300L,
                250L,
                100L
            )
        );
    }

    @Test
    public void doesNotLetOldServiceDestroyOverwriteFastRestart() {
        assertFalse(
            ProtectionServiceLifecyclePolicy.shouldRecordUnexpectedDestroy(
                true,
                false,
                100L,
                300L,
                350L,
                200L
            )
        );
    }

    @Test
    public void transferredRestartOwnershipRestoresUnexpectedDestroyDetection() {
        assertTrue(
            ProtectionServiceLifecyclePolicy.shouldRecordUnexpectedDestroy(
                true,
                false,
                300L,
                300L,
                350L,
                200L
            )
        );
    }

    @Test
    public void transferredRestartOwnershipAlsoSupersedesStaleExplicitStopFlag() {
        assertTrue(
            ProtectionServiceLifecyclePolicy.shouldRecordUnexpectedDestroy(
                true,
                true,
                300L,
                300L,
                350L,
                200L
            )
        );
    }

    @Test
    public void preConfirmationDestroyRemainsStartInterruptedNotUnexpectedDestroy() {
        assertFalse(
            ProtectionServiceLifecyclePolicy.shouldRecordUnexpectedDestroy(
                true,
                false,
                300L,
                300L,
                200L,
                100L
            )
        );
    }
}
