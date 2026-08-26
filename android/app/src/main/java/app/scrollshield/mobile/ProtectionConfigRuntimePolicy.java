package app.scrollshield.mobile;

final class ProtectionConfigRuntimePolicy {
    private ProtectionConfigRuntimePolicy() {}

    static boolean isCurrentGeneration(String evidenceGeneration, String currentGeneration) {
        if (evidenceGeneration == null || currentGeneration == null) return false;
        if (evidenceGeneration.isEmpty() || currentGeneration.isEmpty()) return false;
        return evidenceGeneration.equals(currentGeneration);
    }

    static boolean shouldInvalidateRuntimeState(String previousGeneration, String nextGeneration) {
        if (previousGeneration == null || previousGeneration.isEmpty()) return false;
        if (nextGeneration == null || nextGeneration.isEmpty()) return true;
        return !previousGeneration.equals(nextGeneration);
    }
}
