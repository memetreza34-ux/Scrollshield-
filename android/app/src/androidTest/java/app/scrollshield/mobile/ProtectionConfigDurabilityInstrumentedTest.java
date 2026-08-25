package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class ProtectionConfigDurabilityInstrumentedTest {
    private static final String VALID_CONFIG = "{\"focusMode\":false,\"apps\":[]}";

    private Context context;
    private SharedPreferences preferences;

    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        preferences = context.getSharedPreferences(
            ScrollShieldNativePlugin.PREFERENCES_NAME,
            Context.MODE_PRIVATE
        );
        preferences.edit().clear().commit();
    }

    @Test
    public void durableConfigGenerationBindsStartRequestAndConfirmation() throws Exception {
        ProtectionConfigDurabilityStore.CommitResult config = ProtectionConfigDurabilityStore.commitConfig(
            context,
            VALID_CONFIG,
            "[]",
            "[]"
        );
        assertTrue(config.persisted);
        assertFalse(config.generation.isEmpty());

        assertTrue(ScrollShieldNativePlugin.recordProtectionStartRequested(context, config.generation));
        assertEquals(
            config.generation,
            ProtectionConfigDurabilityStore.getStartRequestGeneration(preferences)
        );
        assertEquals(
            ScrollShieldNativePlugin.ProtectionStartConfirmationResult.CONFIRMED,
            ScrollShieldNativePlugin.recordProtectionServiceStarted(context)
        );
        assertTrue(ScrollShieldNativePlugin.getLastProtectionStartAt(context) > 0L);
    }

    @Test
    public void staleConfigGenerationCannotCreateStartRequest() throws Exception {
        ProtectionConfigDurabilityStore.CommitResult first = ProtectionConfigDurabilityStore.commitConfig(
            context,
            VALID_CONFIG,
            "[]",
            "[]"
        );
        ProtectionConfigDurabilityStore.CommitResult second = ProtectionConfigDurabilityStore.commitConfig(
            context,
            VALID_CONFIG,
            "[]",
            "[]"
        );
        assertTrue(first.persisted);
        assertTrue(second.persisted);
        assertNotEquals(first.generation, second.generation);

        assertFalse(ScrollShieldNativePlugin.recordProtectionStartRequested(context, first.generation));
        assertFalse(ScrollShieldNativePlugin.isProtectionEnabled(context));
        assertEquals(0L, ScrollShieldNativePlugin.getLastProtectionStartRequestAt(context));
    }

    @Test
    public void configChangeBeforeConfirmationFailsClosedWithoutConfirmingOldRequest() throws Exception {
        ProtectionConfigDurabilityStore.CommitResult first = ProtectionConfigDurabilityStore.commitConfig(
            context,
            VALID_CONFIG,
            "[]",
            "[]"
        );
        assertTrue(ScrollShieldNativePlugin.recordProtectionStartRequested(context, first.generation));
        long requestAt = ScrollShieldNativePlugin.getLastProtectionStartRequestAt(context);

        ProtectionConfigDurabilityStore.CommitResult second = ProtectionConfigDurabilityStore.commitConfig(
            context,
            VALID_CONFIG,
            "[]",
            "[]"
        );
        assertNotEquals(first.generation, second.generation);

        assertEquals(
            ScrollShieldNativePlugin.ProtectionStartConfirmationResult.FAILED_CLOSED,
            ScrollShieldNativePlugin.recordProtectionServiceStarted(context)
        );
        assertFalse(ScrollShieldNativePlugin.isProtectionEnabled(context));
        assertEquals(0L, ScrollShieldNativePlugin.getLastProtectionStartAt(context));
        assertTrue(ScrollShieldNativePlugin.getLastProtectionStopAt(context) > requestAt);
        assertEquals(
            ProtectionStopReasonPolicy.START_FAILED,
            ScrollShieldNativePlugin.getLastProtectionStopCode(context)
        );
    }

    @Test
    public void legacyDurableConfigReceivesGenerationBeforeBootStyleStartRequest() {
        assertTrue(preferences.edit().putString(ScrollShieldNativePlugin.CONFIG_KEY, VALID_CONFIG).commit());
        assertEquals("", ProtectionConfigDurabilityStore.getCurrentGeneration(context));

        assertTrue(ScrollShieldNativePlugin.recordProtectionStartRequested(context));
        String generation = ProtectionConfigDurabilityStore.getCurrentGeneration(context);
        assertFalse(generation.isEmpty());
        assertEquals(generation, ProtectionConfigDurabilityStore.getStartRequestGeneration(preferences));
    }
}