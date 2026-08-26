package app.scrollshield.mobile;

final class ProtectionConfigWriteCertaintyPolicy {
    private ProtectionConfigWriteCertaintyPolicy() {}

    static boolean isCertainAfterWrite(boolean candidatePersisted, boolean rollbackPersisted) {
        return candidatePersisted || rollbackPersisted;
    }
}
