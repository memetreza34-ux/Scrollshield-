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

    private static boolean controlledStopAwaitingDestroy;

    private ProtectionServiceDispatchGuard() {}

    /**
     * Requests a real Android service stop while the caller holds LOCK. A successful stop request is
     * remembered until onDestroy consumes it, so a fast stop -> restart cannot make the residual
     * destroy from the older stop look like a new unexpected_service_destroy.
     */
    static boolean dispatchControlledStop(Context context) {
        synchronized (LOCK) {
            boolean requested = context.stopService(
                new Intent(context, ScrollShieldProtectionService.class)
            );
            noteControlledStopDispatched(requested);
            return requested;
        }
    }

    static void noteControlledStopDispatched(boolean requested) {
        synchronized (LOCK) {
            if (requested) controlledStopAwaitingDestroy = true;
        }
    }

    static boolean consumeControlledStopDestroy() {
        synchronized (LOCK) {
            boolean controlled = controlledStopAwaitingDestroy;
            controlledStopAwaitingDestroy = false;
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
        }
    }
}
