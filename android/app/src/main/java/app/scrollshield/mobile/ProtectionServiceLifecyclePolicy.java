package app.scrollshield.mobile;

final class ProtectionServiceLifecyclePolicy {
    static final String MANUAL_APP_STOP_CODE = "manual_app_stop";
    static final String NOTIFICATION_ACTION_STOP_CODE = "notification_action_stop";
    static final String UNEXPECTED_SERVICE_DESTROY_CODE = "unexpected_service_destroy";

    private ProtectionServiceLifecyclePolicy() {}

    static boolean isCurrentNotificationStopGeneration(
        long actionStartRequestAt,
        long serviceStartRequestAt,
        long latestStartRequestAt
    ) {
        return actionStartRequestAt > 0L
            && actionStartRequestAt == serviceStartRequestAt
            && actionStartRequestAt == latestStartRequestAt;
    }

    static boolean shouldRecordUnexpectedDestroy(
        boolean protectionEnabled,
        boolean explicitStopRequested,
        long serviceStartRequestAtOnCreate,
        long latestStartRequestAt,
        long lastStartAt,
        long lastStopAt
    ) {
        if (!protectionEnabled) return false;

        boolean terminalStopAfterThisServiceWasRequested =
            serviceStartRequestAtOnCreate > 0L && lastStopAt >= serviceStartRequestAtOnCreate;
        if (terminalStopAfterThisServiceWasRequested) return false;

        boolean currentRequestIsConfirmed =
            serviceStartRequestAtOnCreate > 0L
                && latestStartRequestAt == serviceStartRequestAtOnCreate
                && lastStartAt > serviceStartRequestAtOnCreate
                && lastStartAt > lastStopAt;

        // ACTION_STOP / prerequisite shutdown can set this flag on an instance that Android keeps
        // alive long enough to accept a newer restart. Once that same instance owns a newer,
        // durably confirmed generation, the old explicit-stop flag must not suppress a later real
        // unexpected destroy of the new activation.
        if (explicitStopRequested && !currentRequestIsConfirmed) return false;

        return !ProtectionStartHandshakePolicy.hasUnconfirmedStartRequest(
            true,
            latestStartRequestAt,
            lastStartAt,
            lastStopAt
        );
    }
}
