package app.scrollshield.mobile;

import java.util.Locale;

final class ProtectionStopReasonPolicy {
    private ProtectionStopReasonPolicy() {}

    static String classifySystemWarning(String description) {
        if (description == null || description.trim().isEmpty()) return "system_warning";

        String normalized = description.toLowerCase(Locale.ROOT);
        if (normalized.contains("nutzungszugriff")) return "usage_access_missing";
        if (normalized.contains("overlay-berechtigung") || normalized.contains("overlay")) {
            return "overlay_permission_missing";
        }
        if (normalized.contains("benachrichtig")) return "notifications_missing";
        if (normalized.contains("keine aktive schutzregel")) return "no_active_rules";
        if (normalized.contains("ziel-app") || normalized.contains("ziel app")) return "target_app_missing";
        if (normalized.contains("neustart") || normalized.contains("app-update")) return "recovery_start_failed";
        return "system_warning";
    }
}
