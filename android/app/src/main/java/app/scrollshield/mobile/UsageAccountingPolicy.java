package app.scrollshield.mobile;

/** Pure helpers for splitting measured usage at a local-day boundary. */
final class UsageAccountingPolicy {
    private UsageAccountingPolicy() {}

    /**
     * Returns {beforeBoundaryMs, afterBoundaryMs}. If the boundary is outside the
     * measured interval, the full non-negative duration remains in the first bucket.
     */
    static long[] splitAtBoundary(long startMs, long endMs, long boundaryMs) {
        if (endMs <= startMs) return new long[] { 0L, 0L };

        long duration = endMs - startMs;
        if (boundaryMs <= startMs || boundaryMs >= endMs) {
            return new long[] { duration, 0L };
        }

        return new long[] {
            boundaryMs - startMs,
            endMs - boundaryMs,
        };
    }
}
