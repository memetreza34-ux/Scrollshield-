package app.scrollshield.mobile;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ScrollShieldSubscriptionIdentityPluginTest {
    @Test
    public void acceptsOnlyCanonicalPrintableSubscriptionChallengeStatements() {
        assertTrue(
            ScrollShieldSubscriptionIdentityPlugin.isValidChallengeStatement(
                "scrollshield-subscription-v1:challenge_1234567890:AbCdEfGhIjKlMnOpQrStUv"
            )
        );

        assertFalse(ScrollShieldSubscriptionIdentityPlugin.isValidChallengeStatement("short"));
        assertFalse(
            ScrollShieldSubscriptionIdentityPlugin.isValidChallengeStatement(
                "wrong-prefix:challenge_1234567890:AbCdEfGhIjKlMnOpQrStUv"
            )
        );
        assertFalse(
            ScrollShieldSubscriptionIdentityPlugin.isValidChallengeStatement(
                "scrollshield-subscription-v1:challenge_1234567890:\nAbCdEfGhIjKlMnOpQrStUv"
            )
        );
    }
}
