package app.scrollshield.mobile;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class NativeCounterRetentionPolicyTest {
    private static final String OPEN_PREFIX = "open_events_";
    private static final String EMERGENCY_PREFIX = "emergency_count_";
    private static final String USAGE_PREFIX = "usage_ms_";

    @Test
    public void keepsCurrentAndPreviousDayEphemeralCounters() {
        assertFalse(
            NativeCounterRetentionPolicy.shouldDeleteEphemeralCounter(
                "open_events_2026-08-16_instagram",
                OPEN_PREFIX,
                "2026-08-16",
                "2026-08-15"
            )
        );
        assertFalse(
            NativeCounterRetentionPolicy.shouldDeleteEphemeralCounter(
                "emergency_count_2026-08-15_instagram",
                EMERGENCY_PREFIX,
                "2026-08-16",
                "2026-08-15"
            )
        );
    }

    @Test
    public void deletesOnlyOlderValidEphemeralCounters() {
        assertTrue(
            NativeCounterRetentionPolicy.shouldDeleteEphemeralCounter(
                "open_events_2026-08-14_instagram",
                OPEN_PREFIX,
                "2026-08-16",
                "2026-08-15"
            )
        );
        assertTrue(
            NativeCounterRetentionPolicy.shouldDeleteEphemeralCounter(
                "emergency_count_2026-01-01_instagram",
                EMERGENCY_PREFIX,
                "2026-08-16",
                "2026-08-15"
            )
        );
    }

    @Test
    public void neverDeletesMalformedOrUnrelatedEphemeralKeys() {
        assertFalse(
            NativeCounterRetentionPolicy.shouldDeleteEphemeralCounter(
                "open_events_bad_instagram",
                OPEN_PREFIX,
                "2026-08-16",
                "2026-08-15"
            )
        );
        assertFalse(
            NativeCounterRetentionPolicy.shouldDeleteEphemeralCounter(
                "usage_ms_2026-01-01_instagram",
                OPEN_PREFIX,
                "2026-08-16",
                "2026-08-15"
            )
        );
    }

    @Test
    public void deletesOnlyOldUsageThatWasAlreadyFullyExported() {
        assertTrue(
            NativeCounterRetentionPolicy.shouldDeleteFullyExportedUsage(
                "usage_ms_2026-06-01_instagram",
                USAGE_PREFIX,
                120_000L,
                120_000L,
                "2026-07-17"
            )
        );

        assertFalse(
            NativeCounterRetentionPolicy.shouldDeleteFullyExportedUsage(
                "usage_ms_2026-06-01_instagram",
                USAGE_PREFIX,
                120_000L,
                60_000L,
                "2026-07-17"
            )
        );
    }

    @Test
    public void keepsUsageInsideRetentionHorizonAndInconsistentMarkers() {
        assertFalse(
            NativeCounterRetentionPolicy.shouldDeleteFullyExportedUsage(
                "usage_ms_2026-07-17_instagram",
                USAGE_PREFIX,
                120_000L,
                120_000L,
                "2026-07-17"
            )
        );
        assertFalse(
            NativeCounterRetentionPolicy.shouldDeleteFullyExportedUsage(
                "usage_ms_2026-06-01_instagram",
                USAGE_PREFIX,
                60_000L,
                120_000L,
                "2026-07-17"
            )
        );
        assertFalse(
            NativeCounterRetentionPolicy.shouldDeleteFullyExportedUsage(
                "usage_ms_2026-06-01_instagram",
                USAGE_PREFIX,
                -1L,
                -1L,
                "2026-07-17"
            )
        );
    }

    @Test
    public void extractsOnlyStrictDatePartitionKeys() {
        assertTrue(
            "2026-08-16".equals(
                NativeCounterRetentionPolicy.extractDay(
                    "usage_ms_2026-08-16_instagram",
                    USAGE_PREFIX
                )
            )
        );
        assertNull(
            NativeCounterRetentionPolicy.extractDay(
                "usage_ms_2026-8-16_instagram",
                USAGE_PREFIX
            )
        );
        assertNull(
            NativeCounterRetentionPolicy.extractDay(
                "usage_ms_2026-08-16",
                USAGE_PREFIX
            )
        );
    }
}
