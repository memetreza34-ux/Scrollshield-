package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class ProtectionStopReasonPolicyTest {
    @Test
    public void classifiesPermissionAndConfigurationFailures() {
        assertEquals(
            "usage_access_missing",
            ProtectionStopReasonPolicy.classifySystemWarning(
                "Nutzungszugriff wurde entzogen; der Android-Schutz wurde gestoppt"
            )
        );
        assertEquals(
            "overlay_permission_missing",
            ProtectionStopReasonPolicy.classifySystemWarning(
                "Overlay-Berechtigung fehlt; der Android-Schutz wurde gestoppt"
            )
        );
        assertEquals(
            "notifications_missing",
            ProtectionStopReasonPolicy.classifySystemWarning(
                "Benachrichtigungen fehlen; der Android-Schutz wurde beendet"
            )
        );
        assertEquals(
            "no_active_rules",
            ProtectionStopReasonPolicy.classifySystemWarning(
                "Keine aktive Schutzregel ist mehr konfiguriert; der Android-Schutz wurde gestoppt"
            )
        );
        assertEquals(
            "target_app_missing",
            ProtectionStopReasonPolicy.classifySystemWarning(
                "Keine aktive installierte Ziel-App ist mehr verfügbar; der Android-Schutz wurde gestoppt"
            )
        );
    }

    @Test
    public void classifiesRecoveryFailuresAndUnknownWarnings() {
        assertEquals(
            "recovery_start_failed",
            ProtectionStopReasonPolicy.classifySystemWarning(
                "Android konnte den Schutz nach dem Neustart nicht automatisch starten"
            )
        );
        assertEquals("system_warning", ProtectionStopReasonPolicy.classifySystemWarning("Unbekannter Hinweis"));
        assertEquals("system_warning", ProtectionStopReasonPolicy.classifySystemWarning(null));
    }
}
