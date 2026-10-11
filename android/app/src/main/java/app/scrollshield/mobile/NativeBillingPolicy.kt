package app.scrollshield.mobile

import java.net.URI

/**
 * Validation only. The receipt, state string and a WebView-side "pro" boolean
 * are never accepted as a native entitlement.
 */
internal object NativeBillingPolicy {
    private val accountIdPattern = Regex("^[a-f0-9]{64}$")
    private val purchaseTokenPattern = Regex("^[A-Za-z0-9._:-]{16,4096}$")

    fun validAccountBinding(id: String): Boolean = accountIdPattern.matches(id)
    fun validPurchaseToken(token: String): Boolean = purchaseTokenPattern.matches(token)

    /** Empty means billing not configured, NOT localhost / a dev fallback. */
    fun normalizedHttpsBase(raw: String): String? {
        if (raw.isEmpty() || raw != raw.trim()) return null
        return try {
            val uri = URI(raw)
            if (uri.scheme != "https" || uri.host.isNullOrBlank() ||
                uri.userInfo != null || uri.port != -1 ||
                uri.rawQuery != null || uri.rawFragment != null ||
                (uri.rawPath != null && uri.rawPath !in listOf("", "/"))) null
            else uri.toString().trimEnd('/')
        } catch (_: Exception) {
            null
        }
    }

    fun canBeginVerification(idToken: String?, backend: String): Boolean =
        !idToken.isNullOrBlank() &&
            idToken.length in 32..8192 &&
            normalizedHttpsBase(backend) != null

    /**
     * This is intentionally a display status only. Even a positive server
     * response is not authority for local/native unlimited Pro rules until a
     * separately verified entitlement integration is implemented.
     */
    fun isVerifiedStatusResponse(source: String, state: String): Boolean =
        source == "verified_google_play" &&
            state.startsWith("SUBSCRIPTION_STATE_")
}
