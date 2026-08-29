package app.scrollshield.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.junit.Test;

import java.util.Arrays;

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

    @Test
    public void convertsCanonicalP256DerSignatureToFixedP1363IncludingLeadingZeroInteger() {
        byte[] r = new byte[33];
        r[0] = 0;
        Arrays.fill(r, 1, r.length, (byte) 0x80);
        byte[] s = new byte[32];
        Arrays.fill(s, (byte) 0x01);

        byte[] der = new byte[2 + 2 + r.length + 2 + s.length];
        int index = 0;
        der[index++] = 0x30;
        der[index++] = (byte) (der.length - 2);
        der[index++] = 0x02;
        der[index++] = (byte) r.length;
        System.arraycopy(r, 0, der, index, r.length);
        index += r.length;
        der[index++] = 0x02;
        der[index++] = (byte) s.length;
        System.arraycopy(s, 0, der, index, s.length);

        byte[] p1363 = ScrollShieldSubscriptionIdentityPlugin.ecdsaDerToP1363(der);
        assertEquals(64, p1363.length);
        assertEquals((byte) 0x80, p1363[0]);
        assertEquals((byte) 0x80, p1363[31]);
        assertEquals((byte) 0x01, p1363[32]);
        assertEquals((byte) 0x01, p1363[63]);
    }

    @Test
    public void rejectsNegativeOrMalformedDerComponents() {
        byte[] negativeR = new byte[] {
            0x30, 0x08,
            0x02, 0x02, (byte) 0x80, 0x01,
            0x02, 0x02, 0x01, 0x01,
        };

        try {
            ScrollShieldSubscriptionIdentityPlugin.ecdsaDerToP1363(negativeR);
            fail("negative DER integer must be rejected");
        } catch (IllegalArgumentException expected) {
            assertTrue(expected.getMessage().contains("positive"));
        }
    }
}
