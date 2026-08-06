package app.scrollshield.mobile;

import java.util.Calendar;

/**
 * Pure rule helpers for deterministic protection decisions.
 *
 * This class intentionally has no Android framework dependencies so boundary
 * behavior can be verified with fast local JVM tests.
 */
final class ProtectionRulePolicy {
    static final String NORMAL = "normal";
    static final String STRICT = "strict";
    static final String BLOCK = "block";

    private ProtectionRulePolicy() {}

    static String normalizeScheduleAction(String value) {
        if (STRICT.equals(value) || BLOCK.equals(value)) return value;
        return NORMAL;
    }

    static String getScheduledAction(
        int dayOfWeek,
        int minuteOfDay,
        String morningRules,
        String workRules,
        String eveningRules,
        String nightRules,
        String weekendRules
    ) {
        int normalizedMinute = Math.floorMod(minuteOfDay, 24 * 60);
        boolean weekend = dayOfWeek == Calendar.SATURDAY || dayOfWeek == Calendar.SUNDAY;

        String weekendAction = normalizeScheduleAction(weekendRules);
        if (weekend && !NORMAL.equals(weekendAction)) return weekendAction;

        String nightAction = normalizeScheduleAction(nightRules);
        if ((normalizedMinute >= 22 * 60 || normalizedMinute < 6 * 60) && !NORMAL.equals(nightAction)) {
            return nightAction;
        }

        String morningAction = normalizeScheduleAction(morningRules);
        if (!weekend && normalizedMinute >= 6 * 60 && normalizedMinute < 9 * 60
            && !NORMAL.equals(morningAction)) {
            return morningAction;
        }

        String workAction = normalizeScheduleAction(workRules);
        if (!weekend && normalizedMinute >= 9 * 60 && normalizedMinute < 17 * 60
            && !NORMAL.equals(workAction)) {
            return workAction;
        }

        String eveningAction = normalizeScheduleAction(eveningRules);
        if (normalizedMinute >= 17 * 60 && normalizedMinute < 22 * 60
            && !NORMAL.equals(eveningAction)) {
            return eveningAction;
        }

        return NORMAL;
    }

    static boolean isInsideBlockedHours(String blockHours, int minuteOfDay) {
        if (blockHours == null) return false;
        String normalized = blockHours.trim();
        if (normalized.isEmpty()) return false;

        String[] range = normalized.split("-");
        if (range.length != 2) return false;

        int startMinutes = parseMinutes(range[0]);
        int endMinutes = parseMinutes(range[1]);
        if (startMinutes < 0 || endMinutes < 0 || startMinutes == endMinutes) return false;

        int currentMinutes = Math.floorMod(minuteOfDay, 24 * 60);
        if (startMinutes < endMinutes) {
            return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        }
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    static boolean isDailyLimitReached(int dailyLimitMinutes, long usageMs) {
        if (dailyLimitMinutes <= 0) return false;
        return Math.max(0L, usageMs) >= dailyLimitMinutes * 60_000L;
    }

    static boolean isAntiBingeWarning(boolean enabled, int recentOpens, int threshold) {
        return enabled && threshold > 0 && Math.max(0, recentOpens) >= threshold;
    }

    static boolean isAntiBingeBlocked(boolean enabled, int recentOpens, int threshold) {
        return enabled && threshold > 0 && Math.max(0, recentOpens) >= threshold;
    }

    static boolean hasEmergencyAvailable(boolean enabled, int usedToday, int maxPerDay) {
        return enabled && maxPerDay > 0 && Math.max(0, usedToday) < maxPerDay;
    }

    private static int parseMinutes(String value) {
        String[] parts = value.trim().split(":");
        if (parts.length != 2) return -1;
        try {
            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1]);
            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return -1;
            return hour * 60 + minute;
        } catch (NumberFormatException error) {
            return -1;
        }
    }
}
