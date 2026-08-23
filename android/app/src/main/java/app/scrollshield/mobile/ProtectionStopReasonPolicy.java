package app.scrollshield.mobile;

import java.util.Locale;

final class ProtectionStopReasonPolicy {
    static final String USAGE_ACCESS_MISSING = "usage_access_missing";
    static final String OVERLAY_PERMISSION_MISSING = "overlay_permission_missing";
    static final String NOTIFICATIONS_MISSING = "notifications_missing";
    static final String NO_ACTIVE_RULES = "no_active_rules";
    static final String TARGET_APP_MISSING = "target_app_missing";
    static final String START_FAILED = "start_failed";
    static final String RECOVERY_START_FAILED = "recovery_start_failed";
    static final String SYSTEM_WARNING = "system_warning";

    private ProtectionStopReasonPolicy() {}

    /**
     * Compatibility fallback for legacy callers that only provide a human-readable description.
     * New protection-service prerequisite and technical system stops must persist a stable constant directly.
     */
    static String classifySystemWarning(String description) {
        if (description == null || description.trim().isEmpty()) return SYSTEM_WARNING;

        String normalized = description.toLowerCase(Locale.ROOT);
        if (normalized.contains("nutzungszugriff")) return USAGE_ACCESS_MISSING;
        if (normalized.contains("overlay-berechtigung") || normalized.contains("overlay")) {
            return OVERLAY_PERMISSION_MISSING;
        }
        if (normalized.contains("benachrichtig")) return NOTIFICATIONS_MISSING;
        if (normalized.contains("keine aktive schutzregel")) return NO_ACTIVE_RULES;
        if (normalized.contains("ziel-app") || normalized.contains("ziel app")) return TARGET_APP_MISSING;
        if (normalized.contains("neustart") || normalized.contains("app-update")) {
            return RECOVERY_START_FAILED;
        }
        if (normalized.contains("schutzdienst") && normalized.contains("nicht starten")) {
            return START_FAILED;
        }
        return SYSTEM_WARNING;
    }
}
