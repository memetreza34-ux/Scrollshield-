package app.scrollshield.mobile;

import java.util.regex.Pattern;

/**
 * Pure retention rules for date-partitioned native counters.
 *
 * This class intentionally does not perform SharedPreferences I/O. Keeping the policy pure makes
 * boundary behavior testable before cleanup is wired into the native persistence path.
 */
public final class NativeCounterRetentionPolicy {
    private static final Pattern ISO_DAY_PATTERN = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");

    private NativeCounterRetentionPolicy() {}

    /**
     * Ephemeral enforcement counters only need the current and previous local day.
     *
     * Keeping the previous day is conservative around short windows that cross midnight and around
     * clock/zone transitions. Malformed or unrelated keys are never deleted by this policy.
     */
    public static boolean shouldDeleteEphemeralCounter(
        String key,
        String prefix,
        String currentDay,
        String previousDay
    ) {
        String day = extractDay(key, prefix);
        if (day == null || !isIsoDay(currentDay) || !isIsoDay(previousDay)) return false;
        return !day.equals(currentDay) && !day.equals(previousDay);
    }

    /**
     * Historical usage may be removed only when it is older than a caller-provided conservative
     * retention cutoff and the persisted total was already fully exported before this cleanup pass.
     *
     * A value with an unexported delta (current > exported), a reset/inconsistent marker
     * (current < exported), a malformed key, or a day inside the retention horizon is retained.
     */
    public static boolean shouldDeleteFullyExportedUsage(
        String usageKey,
        String usagePrefix,
        long current,
        long exported,
        String oldestRetainedDay
    ) {
        String day = extractDay(usageKey, usagePrefix);
        if (day == null || !isIsoDay(oldestRetainedDay)) return false;
        if (current < 0L || exported < 0L || current != exported) return false;
        return day.compareTo(oldestRetainedDay) < 0;
    }

    public static String extractDay(String key, String prefix) {
        if (key == null || prefix == null || !key.startsWith(prefix)) return null;
        int start = prefix.length();
        int separator = start + 10;
        if (key.length() <= separator || key.charAt(separator) != '_') return null;

        String day = key.substring(start, separator);
        return isIsoDay(day) ? day : null;
    }

    private static boolean isIsoDay(String value) {
        return value != null && ISO_DAY_PATTERN.matcher(value).matches();
    }
}
