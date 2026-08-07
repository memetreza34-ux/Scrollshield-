package app.scrollshield.mobile;

final class EmergencyUnlockPolicy {
    static final int MIN_REASON_CHARACTERS = 3;
    static final int MAX_REASON_CHARACTERS = 160;

    private EmergencyUnlockPolicy() {}

    static int resolveCountdownSeconds(
        boolean strict,
        boolean emergencyAvailable,
        boolean requireCountdown,
        int configuredDelaySeconds
    ) {
        int safeDelay = Math.max(0, configuredDelaySeconds);
        if (!strict) return safeDelay;
        if (!emergencyAvailable) return Math.max(30, safeDelay);
        return requireCountdown ? Math.max(30, safeDelay) : safeDelay;
    }

    static String normalizeReason(String reason) {
        if (reason == null) return "";
        String normalized = reason.trim().replaceAll("\\s+", " ");
        if (normalized.length() <= MAX_REASON_CHARACTERS) return normalized;
        return normalized.substring(0, MAX_REASON_CHARACTERS).trim();
    }

    static boolean isReasonSatisfied(boolean requireReason, String reason) {
        return !requireReason || normalizeReason(reason).length() >= MIN_REASON_CHARACTERS;
    }

    static boolean canEmergencyUnlock(
        boolean emergencyAvailable,
        boolean countdownFinished,
        boolean requireReason,
        String reason
    ) {
        return emergencyAvailable
            && countdownFinished
            && isReasonSatisfied(requireReason, reason);
    }
}
