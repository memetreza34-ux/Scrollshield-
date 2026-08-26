package app.scrollshield.mobile;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ProtectionConfigRuntimePolicyTest {
    @Test
    public void runtimeEvidenceIsCurrentOnlyForExactNonEmptyGeneration() {
        String generation = "11111111-2222-4333-8444-555555555555";
        assertTrue(ProtectionConfigRuntimePolicy.isCurrentGeneration(generation, generation));
        assertFalse(
            ProtectionConfigRuntimePolicy.isCurrentGeneration(
                generation,
                "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
            )
        );
        assertFalse(ProtectionConfigRuntimePolicy.isCurrentGeneration("", generation));
        assertFalse(ProtectionConfigRuntimePolicy.isCurrentGeneration(generation, ""));
        assertFalse(ProtectionConfigRuntimePolicy.isCurrentGeneration(null, generation));
    }

    @Test
    public void publishedGenerationChangeInvalidatesExistingRuntimeState() {
        String first = "11111111-2222-4333-8444-555555555555";
        String second = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

        assertFalse(ProtectionConfigRuntimePolicy.shouldInvalidateRuntimeState("", first));
        assertFalse(ProtectionConfigRuntimePolicy.shouldInvalidateRuntimeState(first, first));
        assertTrue(ProtectionConfigRuntimePolicy.shouldInvalidateRuntimeState(first, second));
        assertTrue(ProtectionConfigRuntimePolicy.shouldInvalidateRuntimeState(first, ""));
    }
}
