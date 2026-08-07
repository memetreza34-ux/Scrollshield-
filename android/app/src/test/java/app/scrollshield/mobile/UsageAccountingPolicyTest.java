package app.scrollshield.mobile;

import static org.junit.Assert.assertArrayEquals;

import org.junit.Test;

public class UsageAccountingPolicyTest {
    @Test
    public void keepsSameDayDurationInOneBucket() {
        assertArrayEquals(
            new long[] { 900L, 0L },
            UsageAccountingPolicy.splitAtBoundary(1_000L, 1_900L, 10_000L)
        );
    }

    @Test
    public void splitsExactlyAtMidnightBoundary() {
        assertArrayEquals(
            new long[] { 400L, 500L },
            UsageAccountingPolicy.splitAtBoundary(1_000L, 1_900L, 1_400L)
        );
    }

    @Test
    public void doesNotProduceNegativeUsageWhenClockMovesBackward() {
        assertArrayEquals(
            new long[] { 0L, 0L },
            UsageAccountingPolicy.splitAtBoundary(2_000L, 1_000L, 1_500L)
        );
    }

    @Test
    public void boundaryAtIntervalEdgeDoesNotCreateEmptySecondDayAccounting() {
        assertArrayEquals(
            new long[] { 900L, 0L },
            UsageAccountingPolicy.splitAtBoundary(1_000L, 1_900L, 1_900L)
        );
    }
}
