package app.scrollshield.mobile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.integrity.IntegrityManager;
import com.google.android.play.core.integrity.IntegrityManagerFactory;
import com.google.android.play.core.integrity.IntegrityTokenRequest;

@CapacitorPlugin(name = "ScrollShieldIntegrity")
public class ScrollShieldIntegrityPlugin extends Plugin {
    private static final int MIN_NONCE_LENGTH = 22;
    private static final int MAX_NONCE_LENGTH = 500;

    private IntegrityManager integrityManager;

    @Override
    public void load() {
        super.load();
        integrityManager = IntegrityManagerFactory.create(getContext());
    }

    /**
     * Requests a Play Integrity token for a server-issued base64url nonce from the secure ScrollShield backend.
     *
     * The client deliberately does not generate the challenge itself and never decodes or
     * interprets the returned token. The opaque token must be sent back to the backend, which
     * owns nonce replay protection and all app/account/device verdict decisions.
     */
    @PluginMethod
    public void requestIntegrityToken(PluginCall call) {
        String nonce = call.getString("nonce", "").trim();
        if (!isValidServerNonce(nonce)) {
            call.reject("A valid server-issued base64url nonce is required");
            return;
        }

        IntegrityManager manager = integrityManager;
        if (manager == null) {
            call.reject("Play Integrity is not initialized");
            return;
        }

        IntegrityTokenRequest request = IntegrityTokenRequest.builder()
            .setNonce(nonce)
            .build();

        manager.requestIntegrityToken(request)
            .addOnSuccessListener(response -> {
                String token = response.token();
                if (token == null || token.isEmpty()) {
                    call.reject("Play Integrity returned an empty token");
                    return;
                }

                JSObject result = new JSObject();
                result.put("token", token);
                call.resolve(result);
            })
            .addOnFailureListener(error ->
                call.reject("Play Integrity token request failed", error)
            );
    }

    static boolean isValidServerNonce(String nonce) {
        if (nonce == null || nonce.length() < MIN_NONCE_LENGTH || nonce.length() > MAX_NONCE_LENGTH) {
            return false;
        }

        // Play Integrity nonces are URL-safe Base64 without padding. Enforcing the alphabet here
        // also prevents callers from smuggling arbitrary structured data through this native API.
        for (int index = 0; index < nonce.length(); index++) {
            char value = nonce.charAt(index);
            boolean allowed =
                (value >= 'A' && value <= 'Z')
                    || (value >= 'a' && value <= 'z')
                    || (value >= '0' && value <= '9')
                    || value == '-'
                    || value == '_';
            if (!allowed) return false;
        }
        return true;
    }
}
