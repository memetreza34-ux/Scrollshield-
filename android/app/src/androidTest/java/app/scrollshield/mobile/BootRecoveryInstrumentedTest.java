package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.Intent;
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
public class BootRecoveryInstrumentedTest {
    private Context context;
    private SharedPreferences preferences;
    private ScrollShieldBootReceiver receiver;

    @Before
    public void setUp() {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        preferences = context.getSharedPreferences(
            ScrollShieldNativePlugin.PREFERENCES_NAME,
            Context.MODE_PRIVATE
        );
        preferences.edit().clear().commit();
        receiver = new ScrollShieldBootReceiver();
    }

    @After
    public void tearDown() {
        preferences.edit().clear().commit();
    }

    @Test
    public void unrelatedBroadcastDoesNotChangeExplicitActivation() {
        ScrollShieldNativePlugin.setProtectionEnabled(context, true);

        receiver.onReceive(context, new Intent("app.scrollshield.mobile.TEST_UNRELATED"));

        assertTrue(ScrollShieldNativePlugin.isProtectionEnabled(context));
        assertEquals("", ScrollShieldNativePlugin.getLastProtectionStopCode(context));
    }

    @Test
    public void bootRecoveryFailsClosedWhenNoInstalledTargetExists() throws Exception {
        ScrollShieldNativePlugin.setProtectionEnabled(context, true);
        preferences.edit().putString(ScrollShieldNativePlugin.CONFIG_KEY, "{\"apps\":[]}").commit();
        long before = System.currentTimeMillis();
        String expectedMessage =
            "Der Android-Schutz wurde nach Neustart oder App-Update nicht gestartet, weil keine aktive installierte Ziel-App verfügbar ist";

        receiver.onReceive(context, new Intent(Intent.ACTION_BOOT_COMPLETED));

        assertFalse(ScrollShieldNativePlugin.isProtectionEnabled(context));
        assertEquals("recovery_target_app_missing", ScrollShieldNativePlugin.getLastProtectionStopCode(context));
        assertEquals(expectedMessage, ScrollShieldNativePlugin.getLastProtectionStopMessage(context));
        assertTrue(ScrollShieldNativePlugin.getLastProtectionStopAt(context) >= before);

        JSONArray events = new JSONArray(preferences.getString("protection_events", "[]"));
        assertEquals(1, events.length());
        JSONObject event = events.getJSONObject(0);
        assertEquals("warning", event.getString("type"));
        assertEquals("system", event.getString("appId"));
        assertEquals(expectedMessage, event.getString("desc"));
    }

    @Test
    public void packageReplacementRecoveryAlsoFailsClosedWithoutTarget() throws Exception {
        ScrollShieldNativePlugin.setProtectionEnabled(context, true);
        String unavailableConfig = "{\"apps\":[{\"id\":\"missing\",\"active\":true,\"packages\":[\"example.missing.scrollshield.target\"]}]}";
        preferences.edit().putString(ScrollShieldNativePlugin.CONFIG_KEY, unavailableConfig).commit();

        receiver.onReceive(context, new Intent(Intent.ACTION_MY_PACKAGE_REPLACED));

        assertFalse(ScrollShieldNativePlugin.isProtectionEnabled(context));
        assertEquals("recovery_target_app_missing", ScrollShieldNativePlugin.getLastProtectionStopCode(context));

        JSONArray events = new JSONArray(preferences.getString("protection_events", "[]"));
        assertEquals(1, events.length());
        assertEquals("warning", events.getJSONObject(0).getString("type"));
        assertEquals("system", events.getJSONObject(0).getString("appId"));
    }
}
