package app.scrollshield.mobile;

/**
 * Pure normalization policy for lifecycle diagnostics persisted by the native
 * protection engine. Stable internal codes remain unchanged while arbitrary
 * bridge input is bounded before it reaches SharedPreferences or copied JSON.
 */
final class ProtectionDiagnosticPolicy {
    static final int MAX_CODE_LENGTH = 64;
    static final int MAX_MESSAGE_LENGTH = 500;

    private ProtectionDiagnosticPolicy() {}

    static String normalizeCode(String value, String fallback) {
        String normalizedFallback = normalizeCodeCharacters(fallback);
        String normalized = normalizeCodeCharacters(value);
        if (normalized.isEmpty()) normalized = normalizedFallback;
        return truncate(normalized, MAX_CODE_LENGTH);
    }

    static String normalizeMessage(String value, String fallback) {
        String normalizedFallback = normalizeMessageCharacters(fallback);
        String normalized = normalizeMessageCharacters(value);
        if (normalized.isEmpty()) normalized = normalizedFallback;
        return truncate(normalized, MAX_MESSAGE_LENGTH);
    }

    private static String normalizeCodeCharacters(String value) {
        if (value == null) return "";
        String input = value.trim().toLowerCase(java.util.Locale.US);
        StringBuilder result = new StringBuilder(Math.min(input.length(), MAX_CODE_LENGTH));
        boolean previousSeparator = false;

        for (int index = 0; index < input.length() && result.length() < MAX_CODE_LENGTH; index++) {
            char character = input.charAt(index);
            boolean alphaNumeric =
                (character >= 'a' && character <= 'z') ||
                (character >= '0' && character <= '9');
            if (alphaNumeric || character == '-' || character == '_') {
                result.append(character);
                previousSeparator = character == '-' || character == '_';
                continue;
            }

            if (!previousSeparator && result.length() > 0) {
                result.append('_');
                previousSeparator = true;
            }
        }

        while (result.length() > 0) {
            char last = result.charAt(result.length() - 1);
            if (last != '-' && last != '_') break;
            result.deleteCharAt(result.length() - 1);
        }
        return result.toString();
    }

    private static String normalizeMessageCharacters(String value) {
        if (value == null) return "";
        String input = value.trim();
        StringBuilder result = new StringBuilder(Math.min(input.length(), MAX_MESSAGE_LENGTH));
        boolean previousWhitespace = false;

        for (int index = 0; index < input.length() && result.length() < MAX_MESSAGE_LENGTH; index++) {
            char character = input.charAt(index);
            if (Character.isISOControl(character) || Character.isWhitespace(character)) {
                if (!previousWhitespace && result.length() > 0) {
                    result.append(' ');
                    previousWhitespace = true;
                }
                continue;
            }
            result.append(character);
            previousWhitespace = false;
        }

        int length = result.length();
        if (length > 0 && result.charAt(length - 1) == ' ') result.deleteCharAt(length - 1);
        return result.toString();
    }

    private static String truncate(String value, int maximumLength) {
        return value.length() <= maximumLength ? value : value.substring(0, maximumLength);
    }
}
