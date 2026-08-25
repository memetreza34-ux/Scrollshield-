package app.scrollshield.mobile;

import android.content.Context;
import android.content.Intent;

/**
 * Serializes lifecycle persistence with the Android start/stop dispatch that belongs to it.
 *
 * Without this guard a terminal stop could be persisted between a start-request commit and the
 * matching service dispatch (or vice versa), leaving Android service dispatch ordered differently
 * from durable lifecycle evidence.
 */
final class ProtectionServiceDispatchGuard {
    static final Object LOCK = new Object();
    static final long CONTROLLED_STOP_DESTROY_WINDOW_NANOS = 30_000_000_000L;

    private static boolean controlledStopAwaitingDestroy;
    private static long controlledStopDispatchedAtNanos;

    private ProtectionServiceDispatchGuard() {}

    /**
     * Requests a real Android service stop while the caller holds LOCK. A successful stop request is
     * remembered briefly until onDestroy consumes it, so a fast stop -> restart cannot make the
     * residual destroy from the older stop look like a new unexpected_service_destroy.
     */
    static boolean dispatchControlledStop(Context context) {
        synchronized (LOCK) {
            boolean requested = context.stopService(
                new Intent(context, ScrollShieldProtectionService.class)
            );
            noteControlledStopDispatched(requested, System.nanoTime());
            return requested;
        }
    }

    static void noteControlledStopDispatched(boolean requested) {
        noteControlledStopDispatched(requested, System.nanoTime());
    }

    static void noteControlledStopDispatched(boolean requested, long nowNanos) {
        synchronized (LOCK) {
            if (!requested) return;
            controlledStopAwaitingDestroy = true;
            controlledStopDispatchedAtNanos = nowNanos;
        }
    }

    static boolean consumeControlledStopDestroy() {
        return consumeControlledStopDestroy(System.nanoTime());
    }

    static boolean consumeControlledStopDestroy(long nowNanos) {
        synchronized (LOCK) {
            if (!controlledStopAwaitingDestroy) return false;

            long ageNanos = nowNanos - controlledStopDispatchedAtNanos;
            boolean controlled = ageNanos >= 0L && ageNanos <= CONTROLLED_STOP_DESTROY_WINDOW_NANOS;
            controlledStopAwaitingDestroy = false;
            controlledStopDispatchedAtNanos = 0L;
            return controlled;
        }
    }

    static boolean hasControlledStopAwaitingDestroyForTest() {
        synchronized (LOCK) {
            return controlledStopAwaitingDestroy;
        }
    }

    static void resetForTest() {
        synchronized (LOCK) {
            controlledStopAwaitingDestroy = false;
            controlledStopDispatchedAtNanos = 0L;
        }
    }
}
