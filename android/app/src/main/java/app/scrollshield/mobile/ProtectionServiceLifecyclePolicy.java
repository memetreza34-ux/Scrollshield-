package app.scrollshield.mobile;

final class ProtectionServiceLifecyclePolicy {
    static final String MANUAL_APP_STOP_CODE = "manual_app_stop";
    static final String NOTIFICATION_ACTION_STOP_CODE = "notification_action_stop";
    static final String UNEXPECTED_SERVICE_DESTROY_CODE = "unexpected_service_destroy";

    private ProtectionServiceLifecyclePolicy() {}

    static boolean shouldRecordUnexpectedDestroy(boolean protectionEnabled, boolean explicitStopRequested) {
        return protectionEnabled && !explicitStopRequested;
    }
}
