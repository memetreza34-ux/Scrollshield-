package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Calendar;

import org.junit.Test;

public class ProtectionRulePolicyTest {
    @Test
    public void normalizesUnsupportedScheduleActions() {
        assertEquals(ProtectionRulePolicy.NORMAL, ProtectionRulePolicy.normalizeScheduleAction(null));
        assertEquals(ProtectionRulePolicy.NORMAL, ProtectionRulePolicy.normalizeScheduleAction("warn"));
        assertEquals(ProtectionRulePolicy.STRICT, ProtectionRulePolicy.normalizeScheduleAction("strict"));
        assertEquals(ProtectionRulePolicy.BLOCK, ProtectionRulePolicy.normalizeScheduleAction("block"));
    }

    @Test
    public void appliesWeekdayTimeBoundariesWithoutGaps() {
        assertEquals("night", labelFor(Calendar.MONDAY, minutes(5, 59)));
        assertEquals("morning", labelFor(Calendar.MONDAY, minutes(6, 0)));
        assertEquals("morning", labelFor(Calendar.MONDAY, minutes(8, 59)));
        assertEquals("work", labelFor(Calendar.MONDAY, minutes(9, 0)));
        assertEquals("work", labelFor(Calendar.MONDAY, minutes(16, 59)));
        assertEquals("evening", labelFor(Calendar.MONDAY, minutes(17, 0)));
        assertEquals("evening", labelFor(Calendar.MONDAY, minutes(21, 59)));
        assertEquals("night", labelFor(Calendar.MONDAY, minutes(22, 0)));
    }

    @Test
    public void weekendRuleOverridesOtherWeekendWindows() {
        assertEquals(
            ProtectionRulePolicy.BLOCK,
            ProtectionRulePolicy.getScheduledAction(
                Calendar.SATURDAY,
                minutes(23, 30),
                ProtectionRulePolicy.NORMAL,
                ProtectionRulePolicy.NORMAL,
                ProtectionRulePolicy.STRICT,
                ProtectionRulePolicy.STRICT,
                ProtectionRulePolicy.BLOCK
            )
        );
    }

    @Test
    public void overnightBlockedRangeIncludesBothSidesOfMidnight() {
        assertTrue(ProtectionRulePolicy.isInsideBlockedHours("22:00-07:00", minutes(22, 0)));
        assertTrue(ProtectionRulePolicy.isInsideBlockedHours("22:00-07:00", minutes(23, 59)));
        assertTrue(ProtectionRulePolicy.isInsideBlockedHours("22:00-07:00", minutes(0, 0)));
        assertTrue(ProtectionRulePolicy.isInsideBlockedHours("22:00-07:00", minutes(6, 59)));
        assertFalse(ProtectionRulePolicy.isInsideBlockedHours("22:00-07:00", minutes(7, 0)));
        assertFalse(ProtectionRulePolicy.isInsideBlockedHours("22:00-07:00", minutes(12, 0)));
    }

    @Test
    public void daytimeBlockedRangeUsesExclusiveEnd() {
        assertFalse(ProtectionRulePolicy.isInsideBlockedHours("09:00-17:00", minutes(8, 59)));
        assertTrue(ProtectionRulePolicy.isInsideBlockedHours("09:00-17:00", minutes(9, 0)));
        assertTrue(ProtectionRulePolicy.isInsideBlockedHours("09:00-17:00", minutes(16, 59)));
        assertFalse(ProtectionRulePolicy.isInsideBlockedHours("09:00-17:00", minutes(17, 0)));
    }

    @Test
    public void invalidBlockedRangesFailOpen() {
        assertFalse(ProtectionRulePolicy.isInsideBlockedHours(null, 0));
        assertFalse(ProtectionRulePolicy.isInsideBlockedHours("", 0));
        assertFalse(ProtectionRulePolicy.isInsideBlockedHours("invalid", 0));
        assertFalse(ProtectionRulePolicy.isInsideBlockedHours("25:00-07:00", 0));
        assertFalse(ProtectionRulePolicy.isInsideBlockedHours("07:00-07:00", 0));
    }

    @Test
    public void dailyLimitIsDisabledAtZeroAndTriggersAtExactBoundary() {
        assertFalse(ProtectionRulePolicy.isDailyLimitReached(0, 10_000_000L));
        assertFalse(ProtectionRulePolicy.isDailyLimitReached(30, 29 * 60_000L + 59_999L));
        assertTrue(ProtectionRulePolicy.isDailyLimitReached(30, 30 * 60_000L));
        assertTrue(ProtectionRulePolicy.isDailyLimitReached(30, 31 * 60_000L));
    }

    @Test
    public void antiBingeThresholdsTriggerAtExactCount() {
        assertFalse(ProtectionRulePolicy.isAntiBingeWarning(false, 10, 3));
        assertFalse(ProtectionRulePolicy.isAntiBingeWarning(true, 2, 3));
        assertTrue(ProtectionRulePolicy.isAntiBingeWarning(true, 3, 3));

        assertFalse(ProtectionRulePolicy.isAntiBingeBlocked(true, 4, 5));
        assertTrue(ProtectionRulePolicy.isAntiBingeBlocked(true, 5, 5));
    }

    @Test
    public void emergencyLimitIsStrictlyLessThanDailyMaximum() {
        assertFalse(ProtectionRulePolicy.hasEmergencyAvailable(false, 0, 2));
        assertFalse(ProtectionRulePolicy.hasEmergencyAvailable(true, 0, 0));
        assertTrue(ProtectionRulePolicy.hasEmergencyAvailable(true, 0, 2));
        assertTrue(ProtectionRulePolicy.hasEmergencyAvailable(true, 1, 2));
        assertFalse(ProtectionRulePolicy.hasEmergencyAvailable(true, 2, 2));
        assertFalse(ProtectionRulePolicy.hasEmergencyAvailable(true, 3, 2));
    }

    private static String labelFor(int dayOfWeek, int minuteOfDay) {
        String action = ProtectionRulePolicy.getScheduledAction(
            dayOfWeek,
            minuteOfDay,
            "strict",
            "block",
            "strict",
            "block",
            "normal"
        );
        if (minuteOfDay < minutes(6, 0) || minuteOfDay >= minutes(22, 0)) return action.equals("block") ? "night" : action;
        if (minuteOfDay < minutes(9, 0)) return action.equals("strict") ? "morning" : action;
        if (minuteOfDay < minutes(17, 0)) return action.equals("block") ? "work" : action;
        return action.equals("strict") ? "evening" : action;
    }

    private static int minutes(int hour, int minute) {
        return hour * 60 + minute;
    }
}
