package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ProtectionDiagnosticPolicyTest {
    @Test
    public void stableExistingCodesRemainUnchanged() {
        for (String code : new String[] {
            "manual_app_stop",
            "notification_action_stop",
            "migration_recovery",
            "factory_reset",
            "start_failed",
            "protection_disabled",
            "usage_access_missing",
            "overlay_permission_missing",
            "notifications_missing",
            "no_active_rules",
            "target_app_missing",
            "recovery_start_failed",
            "system_warning",
            "unexpected_service_destroy",
        }) {
            assertEquals(code, ProtectionDiagnosticPolicy.normalizeCode(code, "unknown_stop"));
        }
    }

    @Test
    public void arbitraryCodeInputIsNormalizedAndBounded() {
        String code = ProtectionDiagnosticPolicy.normalizeCode(
            "  BAD Code!! With Spaces / And Controls\n  ",
            "unknown_stop"
        );
        assertEquals("bad_code_with_spaces_and_controls", code);
        assertTrue(code.length() <= ProtectionDiagnosticPolicy.MAX_CODE_LENGTH);
        assertFalse(code.contains(" "));
        assertFalse(code.contains("\n"));

        StringBuilder longCode = new StringBuilder();
        for (int index = 0; index < 100; index++) longCode.append('a');
        assertEquals(
            ProtectionDiagnosticPolicy.MAX_CODE_LENGTH,
            ProtectionDiagnosticPolicy.normalizeCode(longCode.toString(), "unknown_stop").length()
        );
    }

    @Test
    public void emptyCodeFallsBackSafelyButOptionalReadCanRemainEmpty() {
        assertEquals(
            "unknown_stop",
            ProtectionDiagnosticPolicy.normalizeCode(" \n\t ", "unknown_stop")
        );
        assertEquals("", ProtectionDiagnosticPolicy.normalizeCode("", ""));
    }

    @Test
    public void messageCollapsesControlsAndWhitespace() {
        assertEquals(
            "Android Schutz wurde beendet Details folgen",
            ProtectionDiagnosticPolicy.normalizeMessage(
                "  Android Schutz\n\twurde beendet\u0000   Details folgen  ",
                "fallback"
            )
        );
    }

    @Test
    public void messageIsBoundedWithoutDroppingUsefulPrefix() {
        StringBuilder input = new StringBuilder();
        for (int index = 0; index < 700; index++) input.append('x');
        String message = ProtectionDiagnosticPolicy.normalizeMessage(input.toString(), "fallback");
        assertEquals(ProtectionDiagnosticPolicy.MAX_MESSAGE_LENGTH, message.length());
        assertTrue(message.startsWith("xxxxxxxxxx"));
    }

    @Test
    public void emptyMessageFallsBackSafelyButOptionalReadCanRemainEmpty() {
        assertEquals(
            "Unbekannter Stoppgrund",
            ProtectionDiagnosticPolicy.normalizeMessage("", "Unbekannter Stoppgrund")
        );
        assertEquals("", ProtectionDiagnosticPolicy.normalizeMessage("", ""));
    }
}
