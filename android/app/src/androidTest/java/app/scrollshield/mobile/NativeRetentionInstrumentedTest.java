package app.scrollshield.mobile;

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

import java.util.Calendar;

@RunWith(AndroidJUnit4.class)
public class NativeRetentionInstrumentedTest {
    private SharedPreferences preferences;
    private long now;

    @Before
    public void setUp() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        preferences = context.getSharedPreferences(ScrollShieldNativePlugin.PREFERENCES_NAME, Context.MODE_PRIVATE);
        preferences.edit().clear().commit();

        Calendar calendar = Calendar.getInstance();
        calendar.clear();
        calendar.set(2026, Calendar.AUGUST, 16, 12, 0, 0);
        now = calendar.getTimeInMillis();
    }

    @After
    public void tearDown() {
        preferences.edit().clear().commit();
    }

    @Test
    public void cleanupKeepsCurrentAndPreviousEphemeralCountersButRemovesOlderOnes() {
        preferences
            .edit()
            .putString("open_events_2026-08-16_instagram", "[1]")
            .putString("open_events_2026-08-15_instagram", "[2]")
            .putString("open_events_2026-08-14_instagram", "[3]")
            .putInt("emergency_count_2026-08-16_instagram", 1)
            .putInt("emergency_count_2026-08-15_instagram", 1)
            .putInt("emergency_count_2026-08-01_instagram", 1)
            .commit();

        assertTrue(NativeDrainBatchStore.cleanupConfirmedCounters(preferences, now));

        assertTrue(preferences.contains("open_events_2026-08-16_instagram"));
        assertTrue(preferences.contains("open_events_2026-08-15_instagram"));
        assertFalse(preferences.contains("open_events_2026-08-14_instagram"));
        assertTrue(preferences.contains("emergency_count_2026-08-16_instagram"));
        assertTrue(preferences.contains("emergency_count_2026-08-15_instagram"));
        assertFalse(preferences.contains("emergency_count_2026-08-01_instagram"));
    }

    @Test
    public void cleanupDeletesOnlyOldUsageThatIsFullyAcknowledged() {
        String confirmedOld = "usage_ms_2026-06-01_instagram";
        String unconfirmedOld = "usage_ms_2026-06-01_youtube";
        String recentConfirmed = "usage_ms_2026-08-01_instagram";

        preferences
            .edit()
            .putLong(confirmedOld, 120_000L)
            .putLong("exported_" + confirmedOld, 120_000L)
            .putLong(unconfirmedOld, 120_000L)
            .putLong("exported_" + unconfirmedOld, 60_000L)
            .putLong(recentConfirmed, 120_000L)
            .putLong("exported_" + recentConfirmed, 120_000L)
            .commit();

        assertTrue(NativeDrainBatchStore.cleanupConfirmedCounters(preferences, now));

        assertFalse(preferences.contains(confirmedOld));
        assertFalse(preferences.contains("exported_" + confirmedOld));
        assertTrue(preferences.contains(unconfirmedOld));
        assertTrue(preferences.contains("exported_" + unconfirmedOld));
        assertTrue(preferences.contains(recentConfirmed));
        assertTrue(preferences.contains("exported_" + recentConfirmed));
    }

    @Test
    public void cleanupRetainsMalformedAndUnrelatedKeys() {
        preferences
            .edit()
            .putString("open_events_bad_instagram", "[1]")
            .putLong("usage_ms_bad_instagram", 99L)
            .putString("unrelated_key", "keep")
            .commit();

        assertTrue(NativeDrainBatchStore.cleanupConfirmedCounters(preferences, now));

        assertTrue(preferences.contains("open_events_bad_instagram"));
        assertTrue(preferences.contains("usage_ms_bad_instagram"));
        assertTrue(preferences.contains("unrelated_key"));
    }
}
