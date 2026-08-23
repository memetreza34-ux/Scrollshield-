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
    public void recordsUnexpectedDestroyOnlyForStillEnabledProtection() {
        assertTrue(ProtectionServiceLifecyclePolicy.shouldRecordUnexpectedDestroy(true, false));
        assertFalse(ProtectionServiceLifecyclePolicy.shouldRecordUnexpectedDestroy(false, false));
        assertFalse(ProtectionServiceLifecyclePolicy.shouldRecordUnexpectedDestroy(true, true));
        assertFalse(ProtectionServiceLifecyclePolicy.shouldRecordUnexpectedDestroy(false, true));
    }
}
