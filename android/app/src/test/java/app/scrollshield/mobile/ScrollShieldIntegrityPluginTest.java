package app.scrollshield.mobile;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ScrollShieldIntegrityPluginTest {
    @Test
    public void acceptsOnlyBoundedUnpaddedBase64UrlServerNonces() {
        assertTrue(ScrollShieldIntegrityPlugin.isValidServerNonce("AbCdEfGhIjKlMnOpQrStUv"));
        assertTrue(ScrollShieldIntegrityPlugin.isValidServerNonce(repeat('a', 500)));

        assertFalse(ScrollShieldIntegrityPlugin.isValidServerNonce("short"));
        assertFalse(ScrollShieldIntegrityPlugin.isValidServerNonce(repeat('a', 501)));
        assertFalse(ScrollShieldIntegrityPlugin.isValidServerNonce("server+nonce/with=padding"));
        assertFalse(ScrollShieldIntegrityPlugin.isValidServerNonce(null));
    }

    private static String repeat(char value, int count) {
        StringBuilder builder = new StringBuilder(count);
        for (int index = 0; index < count; index++) builder.append(value);
        return builder.toString();
    }
}
