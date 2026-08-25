package app.scrollshield.mobile;

final class ProtectionStartHandshakePolicy {
    static final long CONFIRMATION_GRACE_MS = 15_000L;
    static final long MAX_FUTURE_CLOCK_SKEW_MS = 5_000L;

    private ProtectionStartHandshakePolicy() {}

    static long nextLifecycleTimestamp(
        long now,
        long lastStartRequestAt,
        long lastStartAt,
        long lastStopAt
    ) {
        long boundary = Math.max(lastStartRequestAt, Math.max(lastStartAt, lastStopAt));
        if (boundary == Long.MAX_VALUE) return Long.MAX_VALUE;
        long nextAfterBoundary = boundary + 1L;
        return Math.max(Math.max(0L, now), nextAfterBoundary);
    }

    static boolean hasUnconfirmedStartRequest(
        boolean protectionEnabled,
        long lastStartRequestAt,
        long lastStartAt,
        long lastStopAt
    ) {
        if (!protectionEnabled) return false;
        return lastStartRequestAt > Math.max(lastStartAt, lastStopAt);
    }

    static boolean hasFreshPendingStartRequest(
        boolean protectionEnabled,
        long lastStartRequestAt,
        long lastStartAt,
        long lastStopAt,
        long now
    ) {
        if (!hasUnconfirmedStartRequest(
            protectionEnabled,
            lastStartRequestAt,
            lastStartAt,
            lastStopAt
        )) {
            return false;
        }
        if (now < lastStartRequestAt) {
            long futureSkew = lastStartRequestAt - Math.max(0L, now);
            return futureSkew <= MAX_FUTURE_CLOCK_SKEW_MS;
        }
        return now - lastStartRequestAt <= CONFIRMATION_GRACE_MS;
    }

    static boolean isConfirmationSuperseded(
        boolean protectionEnabled,
        long lastStartRequestAt,
        long lastStopAt
    ) {
        if (!protectionEnabled) return true;
        return lastStartRequestAt > 0L && lastStopAt >= lastStartRequestAt;
    }
}
