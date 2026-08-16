package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
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
public class ProtectionStateInstrumentedTest {
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
    public void protectionDefaultsToDisabled() {
        assertFalse(ScrollShieldNativePlugin.isProtectionEnabled(context));
        assertEquals(0L, ScrollShieldNativePlugin.getLastProtectionStartAt(context));
        assertEquals(0L, ScrollShieldNativePlugin.getLastProtectionStopAt(context));
        assertEquals("", ScrollShieldNativePlugin.getLastProtectionStopCode(context));
    }

    @Test
    public void successfulStartAndDisablePersistLifecycleTruth() {
        long beforeStart = System.currentTimeMillis();

        ScrollShieldNativePlugin.setProtectionEnabled(context, true);
        assertTrue(ScrollShieldNativePlugin.isProtectionEnabled(context));
        assertEquals(0L, ScrollShieldNativePlugin.getLastProtectionStartAt(context));

        ScrollShieldNativePlugin.recordProtectionServiceStarted(context);
        assertTrue(ScrollShieldNativePlugin.getLastProtectionStartAt(context) >= beforeStart);

        long beforeStop = System.currentTimeMillis();
        ScrollShieldNativePlugin.setProtectionEnabled(context, false);

        assertFalse(ScrollShieldNativePlugin.isProtectionEnabled(context));
        assertTrue(ScrollShieldNativePlugin.getLastProtectionStopAt(context) >= beforeStop);
        assertEquals("protection_disabled", ScrollShieldNativePlugin.getLastProtectionStopCode(context));
    }

    @Test
    public void explicitStopDiagnosticIsNormalizedAndPersisted() {
        ScrollShieldNativePlugin.recordProtectionStop(
            context,
            "  START FAILED !!!  ",
            "  Android\n konnte\t den Dienst   nicht starten  "
        );

        assertEquals("start-failed", ScrollShieldNativePlugin.getLastProtectionStopCode(context));
        assertEquals(
            "Android konnte den Dienst nicht starten",
            ScrollShieldNativePlugin.getLastProtectionStopMessage(context)
        );
        assertTrue(ScrollShieldNativePlugin.getLastProtectionStopAt(context) > 0L);
    }

    @Test
    public void configuredAppsRequireAtLeastOneInstalledActiveTarget() {
        String unavailableConfig = "{\"apps\":[{\"id\":\"missing\",\"active\":true,\"packages\":[\"example.missing.scrollshield.target\"]}]}";
        preferences.edit().putString(ScrollShieldNativePlugin.CONFIG_KEY, unavailableConfig).commit();
        assertFalse(ScrollShieldNativePlugin.hasConfiguredApps(context));

        String installedConfig = "{\"apps\":[{\"id\":\"self-test\",\"active\":true,\"packages\":[\"app.scrollshield.mobile\"]}]}";
        preferences.edit().putString(ScrollShieldNativePlugin.CONFIG_KEY, installedConfig).commit();
        assertTrue(ScrollShieldNativePlugin.hasConfiguredApps(context));
    }
}
