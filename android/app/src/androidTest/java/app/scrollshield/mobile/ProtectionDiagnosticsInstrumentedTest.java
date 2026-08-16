package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class ProtectionDiagnosticsInstrumentedTest {
    private Context context;
    private SharedPreferences preferences;

    @Before
    public void setUp() {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        preferences = context.getSharedPreferences(
            ScrollShieldNativePlugin.PREFERENCES_NAME,
            Context.MODE_PRIVATE
        );
        preferences.edit().clear().commit();
    }

    @After
    public void tearDown() {
        preferences.edit().clear().commit();
    }

    @Test
    public void systemPermissionWarningsPersistStableStopDiagnostics() {
        assertSystemWarning(
            "Nutzungszugriff wurde entzogen; der Android-Schutz wurde gestoppt",
            "usage_access_missing"
        );
        assertSystemWarning(
            "Overlay-Berechtigung wurde entzogen; der Android-Schutz wurde gestoppt",
            "overlay_permission_missing"
        );
        assertSystemWarning(
            "Benachrichtigungen wurden entzogen; der Android-Schutz wurde beendet, damit er nicht unsichtbar läuft",
            "notifications_missing"
        );
    }

    @Test
    public void systemConfigurationWarningsPersistStableStopDiagnostics() {
        assertSystemWarning(
            "Keine aktive Schutzregel ist mehr konfiguriert; der Android-Schutz wurde gestoppt",
            "no_active_rules"
        );
        assertSystemWarning(
            "Keine aktive installierte Ziel-App ist mehr verfügbar; der Android-Schutz wurde gestoppt",
            "target_app_missing"
        );
    }

    @Test
    public void appSpecificWarningsDoNotOverwriteTerminalSystemStopDiagnostics() {
        ScrollShieldNativePlugin.recordProtectionStop(
            context,
            "manual_app_stop",
            "Bestehender terminaler Stopp"
        );
        long stopAt = ScrollShieldNativePlugin.getLastProtectionStopAt(context);

        ScrollShieldNativePlugin.appendProtectionEvent(
            context,
            "warning",
            "instagram",
            "App ist nicht installiert oder für Android nicht sichtbar"
        );

        assertEquals("manual_app_stop", ScrollShieldNativePlugin.getLastProtectionStopCode(context));
        assertEquals("Bestehender terminaler Stopp", ScrollShieldNativePlugin.getLastProtectionStopMessage(context));
        assertEquals(stopAt, ScrollShieldNativePlugin.getLastProtectionStopAt(context));
    }

    private void assertSystemWarning(String description, String expectedCode) {
        long before = System.currentTimeMillis();
        ScrollShieldNativePlugin.appendProtectionEvent(
            context,
            "warning",
            "system",
            description
        );

        assertEquals(expectedCode, ScrollShieldNativePlugin.getLastProtectionStopCode(context));
        assertEquals(description, ScrollShieldNativePlugin.getLastProtectionStopMessage(context));
        assertTrue(ScrollShieldNativePlugin.getLastProtectionStopAt(context) >= before);
    }
}
