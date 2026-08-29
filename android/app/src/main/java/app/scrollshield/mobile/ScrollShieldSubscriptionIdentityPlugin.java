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
import java.util.Arrays;

@CapacitorPlugin(name = "ScrollShieldSubscriptionIdentity")
public class ScrollShieldSubscriptionIdentityPlugin extends Plugin {
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "scrollshield_subscription_identity_v1";
    private static final String SIGNATURE_ALGORITHM = "SHA256withECDSA";
    private static final int BASE64_FLAGS = Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP;
    private static final int P256_COMPONENT_BYTES = 32;
    private static final int P256_P1363_SIGNATURE_BYTES = 64;

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
     *
     * Android's SHA256withECDSA provider emits ASN.1 DER. The bridge converts that output
     * to the fixed 64-byte IEEE-P1363 r||s representation used by ES256/WebCrypto so the
     * backend has one unambiguous signature format.
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
            byte[] p1363Signature = ecdsaDerToP1363(signer.sign());

            JSObject result = identityResult(pair.getPublic());
            result.put("signature", Base64.encodeToString(p1363Signature, BASE64_FLAGS));
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

    static byte[] ecdsaDerToP1363(byte[] derSignature) {
        if (derSignature == null || derSignature.length < 8 || derSignature.length > 80) {
            throw new IllegalArgumentException("Invalid ECDSA DER signature length");
        }

        int index = 0;
        if ((derSignature[index++] & 0xff) != 0x30) {
            throw new IllegalArgumentException("ECDSA signature must be a DER sequence");
        }

        int sequenceLength = derSignature[index++] & 0xff;
        if ((sequenceLength & 0x80) != 0 || sequenceLength != derSignature.length - index) {
            throw new IllegalArgumentException("Unsupported ECDSA DER sequence length");
        }

        if (index >= derSignature.length || (derSignature[index++] & 0xff) != 0x02) {
            throw new IllegalArgumentException("ECDSA DER signature is missing r");
        }
        if (index >= derSignature.length) throw new IllegalArgumentException("Invalid ECDSA r length");
        int rLength = derSignature[index++] & 0xff;
        if (rLength <= 0 || index + rLength > derSignature.length) {
            throw new IllegalArgumentException("Invalid ECDSA r component");
        }
        byte[] r = Arrays.copyOfRange(derSignature, index, index + rLength);
        index += rLength;

        if (index >= derSignature.length || (derSignature[index++] & 0xff) != 0x02) {
            throw new IllegalArgumentException("ECDSA DER signature is missing s");
        }
        if (index >= derSignature.length) throw new IllegalArgumentException("Invalid ECDSA s length");
        int sLength = derSignature[index++] & 0xff;
        if (sLength <= 0 || index + sLength != derSignature.length) {
            throw new IllegalArgumentException("Invalid ECDSA s component");
        }
        byte[] s = Arrays.copyOfRange(derSignature, index, index + sLength);

        byte[] output = new byte[P256_P1363_SIGNATURE_BYTES];
        copyPositiveDerInteger(r, output, 0);
        copyPositiveDerInteger(s, output, P256_COMPONENT_BYTES);
        return output;
    }

    private static void copyPositiveDerInteger(byte[] value, byte[] output, int outputOffset) {
        if (value.length == 0 || (value[0] & 0x80) != 0) {
            throw new IllegalArgumentException("ECDSA DER integer must be positive");
        }

        int offset = 0;
        while (value.length - offset > P256_COMPONENT_BYTES && value[offset] == 0) offset++;
        int length = value.length - offset;
        if (length <= 0 || length > P256_COMPONENT_BYTES) {
            throw new IllegalArgumentException("ECDSA component is outside P-256 range");
        }
        System.arraycopy(value, offset, output, outputOffset + P256_COMPONENT_BYTES - length, length);
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
