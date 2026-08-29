package app.scrollshield.mobile;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;

@CapacitorPlugin(name = "ScrollShieldSubscriptionIdentity")
public class ScrollShieldSubscriptionIdentityPlugin extends Plugin {
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "scrollshield_subscription_identity_v1";
    private static final String SIGNATURE_ALGORITHM = "SHA256withECDSA";
    private static final int BASE64_FLAGS = Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP;

    @PluginMethod
    public void getIdentity(PluginCall call) {
        try {
            PublicKey publicKey = getOrCreateKeyPair().getPublic();
            call.resolve(identityResult(publicKey));
        } catch (Exception error) {
            call.reject("Unable to load the subscription installation identity", error);
        }
    }

    /**
     * Signs the exact backend challenge statement with a private key that never leaves
     * Android Keystore. The signature is proof of installation-key possession only; it
     * never grants Plus/Max by itself and must be combined with Play Integrity and
     * server-side Google Play subscription verification.
     */
    @PluginMethod
    public void signChallenge(PluginCall call) {
        String statement = call.getString("statement", "");
        if (!isValidChallengeStatement(statement)) {
            call.reject("A valid backend subscription challenge statement is required");
            return;
        }

        try {
            KeyPair pair = getOrCreateKeyPair();
            Signature signer = Signature.getInstance(SIGNATURE_ALGORITHM);
            signer.initSign(pair.getPrivate());
            signer.update(statement.getBytes(StandardCharsets.UTF_8));

            JSObject result = identityResult(pair.getPublic());
            result.put("signature", Base64.encodeToString(signer.sign(), BASE64_FLAGS));
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to sign the subscription challenge", error);
        }
    }

    private KeyPair getOrCreateKeyPair() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);

        if (keyStore.containsAlias(KEY_ALIAS)) {
            PublicKey publicKey = keyStore.getCertificate(KEY_ALIAS).getPublicKey();
            PrivateKey privateKey = (PrivateKey) keyStore.getKey(KEY_ALIAS, null);
            if (publicKey != null && privateKey != null) return new KeyPair(publicKey, privateKey);
            keyStore.deleteEntry(KEY_ALIAS);
        }

        KeyPairGenerator generator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_EC,
            ANDROID_KEYSTORE
        );
        KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY
        )
            .setAlgorithmParameterSpec(new ECGenParameterSpec("secp256r1"))
            .setDigests(KeyProperties.DIGEST_SHA256)
            .build();
        generator.initialize(spec);
        return generator.generateKeyPair();
    }

    private JSObject identityResult(PublicKey publicKey) throws Exception {
        byte[] encoded = publicKey.getEncoded();
        JSObject result = new JSObject();
        result.put("keyId", keyIdForPublicKey(encoded));
        result.put("publicKeySpki", Base64.encodeToString(encoded, BASE64_FLAGS));
        result.put("algorithm", "ES256");
        return result;
    }

    static String keyIdForPublicKey(byte[] encodedPublicKey) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return Base64.encodeToString(digest.digest(encodedPublicKey), BASE64_FLAGS);
    }

    static boolean isValidChallengeStatement(String statement) {
        if (statement == null || statement.length() < 40 || statement.length() > 1024) return false;
        if (!statement.startsWith("scrollshield-subscription-v1:")) return false;

        for (int index = 0; index < statement.length(); index++) {
            char value = statement.charAt(index);
            if (value < 0x21 || value > 0x7e) return false;
        }
        return true;
    }
}
