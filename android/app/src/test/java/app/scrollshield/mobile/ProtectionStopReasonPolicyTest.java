package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class ProtectionStopReasonPolicyTest {
    @Test
    public void exposesStablePrerequisiteStopCodes() {
        assertEquals("usage_access_missing", ProtectionStopReasonPolicy.USAGE_ACCESS_MISSING);
        assertEquals("overlay_permission_missing", ProtectionStopReasonPolicy.OVERLAY_PERMISSION_MISSING);
        assertEquals("notifications_missing", ProtectionStopReasonPolicy.NOTIFICATIONS_MISSING);
        assertEquals("no_active_rules", ProtectionStopReasonPolicy.NO_ACTIVE_RULES);
        assertEquals("target_app_missing", ProtectionStopReasonPolicy.TARGET_APP_MISSING);
        assertEquals("recovery_start_failed", ProtectionStopReasonPolicy.RECOVERY_START_FAILED);
        assertEquals("system_warning", ProtectionStopReasonPolicy.SYSTEM_WARNING);
    }

    @Test
    public void legacyTextFallbackStillClassifiesPermissionAndConfigurationFailures() {
        assertEquals(
            ProtectionStopReasonPolicy.USAGE_ACCESS_MISSING,
            ProtectionStopReasonPolicy.classifySystemWarning(
                "Nutzungszugriff wurde entzogen; der Android-Schutz wurde gestoppt"
            )
        );
        assertEquals(
            ProtectionStopReasonPolicy.OVERLAY_PERMISSION_MISSING,
            ProtectionStopReasonPolicy.classifySystemWarning(
                "Overlay-Berechtigung fehlt; der Android-Schutz wurde gestoppt"
            )
        );
        assertEquals(
            ProtectionStopReasonPolicy.NOTIFICATIONS_MISSING,
            ProtectionStopReasonPolicy.classifySystemWarning(
                "Benachrichtigungen fehlen; der Android-Schutz wurde beendet"
            )
        );
        assertEquals(
            ProtectionStopReasonPolicy.NO_ACTIVE_RULES,
            ProtectionStopReasonPolicy.classifySystemWarning(
                "Keine aktive Schutzregel ist mehr konfiguriert; der Android-Schutz wurde gestoppt"
            )
        );
        assertEquals(
            ProtectionStopReasonPolicy.TARGET_APP_MISSING,
            ProtectionStopReasonPolicy.classifySystemWarning(
                "Keine aktive installierte Ziel-App ist mehr verfügbar; der Android-Schutz wurde gestoppt"
            )
        );
    }

    @Test
    public void legacyTextFallbackClassifiesRecoveryAndUnknownWarnings() {
        assertEquals(
            ProtectionStopReasonPolicy.RECOVERY_START_FAILED,
            ProtectionStopReasonPolicy.classifySystemWarning(
                "Android konnte den Schutz nach dem Neustart nicht automatisch starten"
            )
        );
        assertEquals(
            ProtectionStopReasonPolicy.SYSTEM_WARNING,
            ProtectionStopReasonPolicy.classifySystemWarning("Unbekannter Hinweis")
        );
        assertEquals(
            ProtectionStopReasonPolicy.SYSTEM_WARNING,
            ProtectionStopReasonPolicy.classifySystemWarning(null)
        );
    }
}
