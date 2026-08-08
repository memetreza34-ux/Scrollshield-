package app.scrollshield.mobile;

/**
 * Pure deterministic policy for progressively increasing the normal opening
 * pause after repeated intentional app opens.
 *
 * Adaptive friction deliberately reuses the existing local Anti-Binge counter.
 * It never creates a strict block itself and never changes emergency-unlock
 * timing. Those decisions remain owned by the existing rule/emergency policies.
 */
final class AdaptiveFrictionPolicy {
    static final int ESCALATION_STEP_SECONDS = 5;
    static final int MAX_ADAPTIVE_DELAY_SECONDS = 60;

    private AdaptiveFrictionPolicy() {}

    static int resolveDelaySeconds(
        boolean enabled,
        int baseDelaySeconds,
        int recentIntentionalOpens,
        int warningThreshold
    ) {
        int baseDelay = Math.max(0, baseDelaySeconds);
        int opens = Math.max(0, recentIntentionalOpens);
        if (!enabled || warningThreshold <= 0 || opens < warningThreshold) return baseDelay;

        int escalationCount = opens - warningThreshold + 1;
        long increased = baseDelay + (long) escalationCount * ESCALATION_STEP_SECONDS;
        int cap = Math.max(baseDelay, MAX_ADAPTIVE_DELAY_SECONDS);
        return (int) Math.min(increased, cap);
    }

    static boolean isEscalated(
        boolean enabled,
        int baseDelaySeconds,
        int recentIntentionalOpens,
        int warningThreshold
    ) {
        return resolveDelaySeconds(
            enabled,
            baseDelaySeconds,
            recentIntentionalOpens,
            warningThreshold
        ) > Math.max(0, baseDelaySeconds);
    }
}
