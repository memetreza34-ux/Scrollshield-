package app.scrollshield.mobile;

/**
 * Serializes lifecycle persistence with the Android start/stop dispatch that belongs to it.
 *
 * Without this guard a terminal stop could be persisted between a start-request commit and the
 * matching startForegroundService(...) call (or vice versa), leaving Android service dispatch
 * ordered differently from the durable lifecycle evidence. Callers must hold LOCK across both the
 * persistence boundary and the corresponding Android start/stop request.
 */
final class ProtectionServiceDispatchGuard {
    static final Object LOCK = new Object();

    private ProtectionServiceDispatchGuard() {}
}
