package app.scrollshield.mobile;

final class ProtectionConfigRuntimePolicy {
    private ProtectionConfigRuntimePolicy() {}

    static boolean isCurrentGeneration(String evidenceGeneration, String currentGeneration) {
        if (evidenceGeneration == null || currentGeneration == null) return false;
        if (evidenceGeneration.isEmpty() || currentGeneration.isEmpty()) return false;
        return evidenceGeneration.equals(currentGeneration);
    }

    static boolean canUsePublishedRuntimeState(
        boolean writeStateCertain,
        String evidenceGeneration,
        String publishedGeneration,
        String currentPersistedGeneration
    ) {
        if (!isCurrentGeneration(evidenceGeneration, publishedGeneration)) return false;
        if (!writeStateCertain) {
            // Persistence is unresolved, so the preference tuple cannot safely replace the
            // already-published in-memory rules. Existing runtime actions may continue only
            // against that last confirmed published generation.
            return true;
        }
        return isCurrentGeneration(publishedGeneration, currentPersistedGeneration);
    }

    static boolean shouldInvalidateRuntimeState(String previousGeneration, String nextGeneration) {
        if (previousGeneration == null || previousGeneration.isEmpty()) return false;
        if (nextGeneration == null || nextGeneration.isEmpty()) return true;
        return !previousGeneration.equals(nextGeneration);
    }
}
