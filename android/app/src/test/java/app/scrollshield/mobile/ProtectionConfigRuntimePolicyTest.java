package app.scrollshield.mobile;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ProtectionConfigRuntimePolicyTest {
    private static final String FIRST = "11111111-2222-4333-8444-555555555555";
    private static final String SECOND = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

    @Test
    public void runtimeEvidenceIsCurrentOnlyForExactNonEmptyGeneration() {
        assertTrue(ProtectionConfigRuntimePolicy.isCurrentGeneration(FIRST, FIRST));
        assertFalse(ProtectionConfigRuntimePolicy.isCurrentGeneration(FIRST, SECOND));
        assertFalse(ProtectionConfigRuntimePolicy.isCurrentGeneration("", FIRST));
        assertFalse(ProtectionConfigRuntimePolicy.isCurrentGeneration(FIRST, ""));
        assertFalse(ProtectionConfigRuntimePolicy.isCurrentGeneration(null, FIRST));
    }

    @Test
    public void certainWritesRequirePublishedGenerationToStillMatchPersistence() {
        assertTrue(
            ProtectionConfigRuntimePolicy.canUsePublishedRuntimeState(
                true,
                FIRST,
                FIRST,
                FIRST
            )
        );
        assertFalse(
            ProtectionConfigRuntimePolicy.canUsePublishedRuntimeState(
                true,
                FIRST,
                FIRST,
                SECOND
            )
        );
    }

    @Test
    public void uncertainWritesKeepOnlyLastPublishedGenerationUsable() {
        assertTrue(
            ProtectionConfigRuntimePolicy.canUsePublishedRuntimeState(
                false,
                FIRST,
                FIRST,
                SECOND
            )
        );
        assertFalse(
            ProtectionConfigRuntimePolicy.canUsePublishedRuntimeState(
                false,
                SECOND,
                FIRST,
                SECOND
            )
        );
    }

    @Test
    public void publishedGenerationChangeInvalidatesExistingRuntimeState() {
        assertFalse(ProtectionConfigRuntimePolicy.shouldInvalidateRuntimeState("", FIRST));
        assertFalse(ProtectionConfigRuntimePolicy.shouldInvalidateRuntimeState(FIRST, FIRST));
        assertTrue(ProtectionConfigRuntimePolicy.shouldInvalidateRuntimeState(FIRST, SECOND));
        assertTrue(ProtectionConfigRuntimePolicy.shouldInvalidateRuntimeState(FIRST, ""));
    }
}
