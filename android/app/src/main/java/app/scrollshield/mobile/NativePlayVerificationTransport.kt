package app.scrollshield.mobile

import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection

/**
 * Direct Android-to-server purchase-token transport. Never routes receipt,
 * purchase token or Firebase ID token through WebView storage or app backups.
 * All calls MUST run off Android's UI thread.
 *
 * The server validates Firebase JWT, Google Play subscription state/product,
 * expiry, and the purchase's server-generated obfuscated account binding.
 */
internal class NativePlayVerificationTransport(configuredEndpoint: String) {
    private val base = NativeBillingPolicy.normalizedHttpsBase(configuredEndpoint)
        ?: throw IllegalStateException("Play verification is not configured")

    fun accountBinding(firebaseIdToken: String): String {
        val body = post("/v1/play/account-id", firebaseIdToken, JSONObject())
        val binding = body.optString("obfuscatedAccountId")
        if (!NativeBillingPolicy.validAccountBinding(binding)) {
            throw IllegalStateException("No valid Play account binding returned")
        }
        return binding
    }

    fun verify(firebaseIdToken: String, purchaseToken: String): VerifiedPlayObservation {
        if (!NativeBillingPolicy.validPurchaseToken(purchaseToken)) {
            throw IllegalArgumentException("Invalid purchase token")
        }
        val body = post(
            "/v1/play/verify",
            firebaseIdToken,
            JSONObject().put("purchaseToken", purchaseToken),
        )
        val source = body.optString("source")
        val state = body.optString("state")
        if (!NativeBillingPolicy.isVerifiedStatusResponse(source, state)) {
            throw IllegalStateException("Unrecognized verification response")
        }
        return VerifiedPlayObservation(
            active = body.optBoolean("pro", false),
            state = state,
            expiresAt = body.optString("expiresAt").takeIf { it.isNotBlank() && it != "null" },
        )
    }

    private fun post(path: String, firebaseIdToken: String, payload: JSONObject): JSONObject {
        if (!NativeBillingPolicy.canBeginVerification(firebaseIdToken, base)) {
            throw IllegalArgumentException("Identity or server configuration missing")
        }
        val url = URL(base + path)
        val connection = (url.openConnection() as HttpsURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 6_000
            readTimeout = 9_000
            instanceFollowRedirects = false
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Authorization", "Bearer " + firebaseIdToken)
        }
        try {
            connection.outputStream.use { stream ->
                stream.write(payload.toString().toByteArray(Charsets.UTF_8))
            }
            if (connection.responseCode != 200) {
                // Never echo a Google API payload or JWT to error screens/logs.
                throw IllegalStateException("Play backend verification rejected or unavailable")
            }
            // Apply the response limit while streaming, not after readText():
            // a misconfigured upstream must never allocate unbounded memory.
            val result = connection.inputStream.bufferedReader(Charsets.UTF_8).use { reader ->
                val buffer = CharArray(2_048)
                val content = StringBuilder()
                while (true) {
                    val count = reader.read(buffer)
                    if (count < 0) break
                    if (content.length + count > 16_384) {
                        throw IllegalStateException("Response too large")
                    }
                    content.append(buffer, 0, count)
                }
                content.toString()
            }
            return JSONObject(result)
        } finally {
            connection.disconnect()
        }
    }
}

internal data class VerifiedPlayObservation(
    val active: Boolean,
    val state: String,
    val expiresAt: String?,
)
