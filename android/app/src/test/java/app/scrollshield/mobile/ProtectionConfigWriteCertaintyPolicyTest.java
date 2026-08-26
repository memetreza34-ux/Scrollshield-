package app.scrollshield.mobile;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ProtectionConfigWriteCertaintyPolicyTest {
    @Test
    public void successfulCandidateCommitIsCertain() {
        assertTrue(ProtectionConfigWriteCertaintyPolicy.isCertainAfterWrite(true, false));
    }

    @Test
    public void failedCandidateWithSuccessfulRollbackIsCertain() {
        assertTrue(ProtectionConfigWriteCertaintyPolicy.isCertainAfterWrite(false, true));
    }

    @Test
    public void failedCandidateAndRollbackIsUncertain() {
        assertFalse(ProtectionConfigWriteCertaintyPolicy.isCertainAfterWrite(false, false));
    }
}
