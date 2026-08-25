package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ProtectionConfigDurabilityStoreTest {
    @Test
    public void generationNormalizationAcceptsOnlyCanonicalUuidValues() {
        String value = "A1B2C3D4-E5F6-47A8-9B10-112233445566";
        assertEquals(
            "a1b2c3d4-e5f6-47a8-9b10-112233445566",
            ProtectionConfigDurabilityStore.normalizeGeneration(value)
        );
        assertEquals("", ProtectionConfigDurabilityStore.normalizeGeneration("not-a-generation"));
        assertEquals("", ProtectionConfigDurabilityStore.normalizeGeneration(""));
        assertEquals("", ProtectionConfigDurabilityStore.normalizeGeneration(null));
    }

    @Test
    public void generationEqualityIsExactAfterNormalization() {
        String first = ProtectionConfigDurabilityStore.normalizeGeneration(
            "11111111-2222-4333-8444-555555555555"
        );
        String same = ProtectionConfigDurabilityStore.normalizeGeneration(
            "11111111-2222-4333-8444-555555555555"
        );
        String other = ProtectionConfigDurabilityStore.normalizeGeneration(
            "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
        );

        assertTrue(!first.isEmpty());
        assertEquals(first, same);
        assertFalse(first.equals(other));
    }
}
