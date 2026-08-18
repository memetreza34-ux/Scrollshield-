package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.json.JSONArray;
import org.json.JSONObject;
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
    public void atomicPrerequisiteStopPersistsDisabledStateEventAndExactCode() throws Exception {
        ScrollShieldNativePlugin.setProtectionEnabled(context, true);
        long before = System.currentTimeMillis();
        String message = "Usage access revoked while protection was active";

        assertTrue(
            ScrollShieldNativePlugin.recordProtectionPrerequisiteStop(
                context,
                ProtectionStopReasonPolicy.USAGE_ACCESS_MISSING,
                message
            )
        );

        assertFalse(ScrollShieldNativePlugin.isProtectionEnabled(context));
        assertEquals(
            ProtectionStopReasonPolicy.USAGE_ACCESS_MISSING,
            ScrollShieldNativePlugin.getLastProtectionStopCode(context)
        );
        assertEquals(message, ScrollShieldNativePlugin.getLastProtectionStopMessage(context));
        assertTrue(ScrollShieldNativePlugin.getLastProtectionStopAt(context) >= before);

        JSONArray events = new JSONArray(preferences.getString("protection_events", "[]"));
        assertTrue(events.length() > 0);
        JSONObject event = events.getJSONObject(events.length() - 1);
        assertEquals("warning", event.getString("type"));
        assertEquals("system", event.getString("appId"));
        assertEquals(message, event.getString("desc"));
    }

    @Test
    public void explicitPrerequisiteCodesPersistIndependentOfMessageLanguage() {
        assertExplicitStop(
            ProtectionStopReasonPolicy.USAGE_ACCESS_MISSING,
            "Usage access revoked while protection was active"
        );
        assertExplicitStop(
            ProtectionStopReasonPolicy.OVERLAY_PERMISSION_MISSING,
            "Overlay permission unavailable"
        );
        assertExplicitStop(
            ProtectionStopReasonPolicy.NOTIFICATIONS_MISSING,
            "Notification visibility unavailable"
        );
        assertExplicitStop(
            ProtectionStopReasonPolicy.NO_ACTIVE_RULES,
            "No active protection rule remains"
        );
        assertExplicitStop(
            ProtectionStopReasonPolicy.TARGET_APP_MISSING,
            "No installed target app remains"
        );
    }

    @Test
    public void legacySystemPermissionWarningsStillPersistStableStopDiagnostics() {
        assertSystemWarning(
            "Nutzungszugriff wurde entzogen; der Android-Schutz wurde gestoppt",
            ProtectionStopReasonPolicy.USAGE_ACCESS_MISSING
        );
        assertSystemWarning(
            "Overlay-Berechtigung wurde entzogen; der Android-Schutz wurde gestoppt",
            ProtectionStopReasonPolicy.OVERLAY_PERMISSION_MISSING
        );
        assertSystemWarning(
            "Benachrichtigungen wurden entzogen; der Android-Schutz wurde beendet, damit er nicht unsichtbar läuft",
            ProtectionStopReasonPolicy.NOTIFICATIONS_MISSING
        );
    }

    @Test
    public void legacySystemConfigurationWarningsStillPersistStableStopDiagnostics() {
        assertSystemWarning(
            "Keine aktive Schutzregel ist mehr konfiguriert; der Android-Schutz wurde gestoppt",
            ProtectionStopReasonPolicy.NO_ACTIVE_RULES
        );
        assertSystemWarning(
            "Keine aktive installierte Ziel-App ist mehr verfügbar; der Android-Schutz wurde gestoppt",
            ProtectionStopReasonPolicy.TARGET_APP_MISSING
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

    private void assertExplicitStop(String code, String message) {
        ScrollShieldNativePlugin.setProtectionEnabled(context, true);
        long before = System.currentTimeMillis();
        assertTrue(
            ScrollShieldNativePlugin.recordProtectionPrerequisiteStop(context, code, message)
        );

        assertFalse(ScrollShieldNativePlugin.isProtectionEnabled(context));
        assertEquals(code, ScrollShieldNativePlugin.getLastProtectionStopCode(context));
        assertEquals(message, ScrollShieldNativePlugin.getLastProtectionStopMessage(context));
        assertTrue(ScrollShieldNativePlugin.getLastProtectionStopAt(context) >= before);
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
