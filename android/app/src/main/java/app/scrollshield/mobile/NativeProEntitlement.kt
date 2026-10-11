package app.scrollshield.mobile

import android.content.SharedPreferences
import org.json.JSONObject
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

/**
 * Production Pro is ONLY enabled by a short-lived server/KMS-signed claim.
 *
 * Token: SS1.<base64url JSON>.<base64url RSA-PKCS1-v1_5 SHA256 signature>
 * The signature covers the exact "SS1.<payload>" UTF-8 bytes.
 *
 * Public SPKI is supplied via a RELEASE build property. Empty / invalid keys
 * and unsigned, expired or replayed-after-clock-rollback claims fail closed.
 * Store no Firebase JWT, raw purchase token or private signing key here.
 */
internal object NativeProEntitlement {
    const val KEY_SIGNED_TOKEN = "verified_pro_entitlement"
    const val KEY_MAX_WALL_CLOCK = "verified_pro_max_wall_clock"
    private const val AUDIENCE = "app.scrollshield.mobile"
    private const val MAX_LIFETIME_SECONDS = 900L
    private const val MAX_FUTURE_SKEW_SECONDS = 60L

    fun verifiedExpirationSeconds(
        signed: String?,
        spkiBase64: String,
        nowMillis: Long,
    ): Long? {
        if (signed.isNullOrBlank() || spkiBase64.isBlank() ||
            signed.length > 5000 || nowMillis <= 0L) return null
        return try {
            val parts = signed.split('.')
            if (parts.size != 3 || parts[0] != "SS1") return null
            val message = parts[0] + "." + parts[1]
            val payload = JSONObject(String(Base64.getUrlDecoder().decode(parts[1]), Charsets.UTF_8))
            val publicKeyBytes = Base64.getDecoder().decode(spkiBase64)
            val key = KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(publicKeyBytes))
            val signature = Signature.getInstance("SHA256withRSA")
            signature.initVerify(key)
            signature.update(message.toByteArray(Charsets.UTF_8))
            if (!signature.verify(Base64.getUrlDecoder().decode(parts[2]))) return null

            val issued = payload.optLong("iat", -1L)
            val expiry = payload.optLong("exp", -1L)
            val nowSeconds = nowMillis / 1000L
            if (payload.optInt("v", -1) != 1 ||
                payload.optString("aud") != AUDIENCE ||
                payload.optString("plan") != "pro" ||
                !payload.optBoolean("pro", false) ||
                issued <= 0L || expiry <= issued ||
                expiry - issued > MAX_LIFETIME_SECONDS ||
                issued > nowSeconds + MAX_FUTURE_SKEW_SECONDS ||
                expiry <= nowSeconds ||
                !Regex("^[a-f0-9]{64}$").matches(payload.optString("sub"))) null
            else expiry
        } catch (_: Exception) {
            null
        }
    }

    fun isActive(
        prefs: SharedPreferences,
        publicKeyBase64: String,
        nowMillis: Long = System.currentTimeMillis(),
    ): Boolean {
        if (publicKeyBase64.isBlank()) return false
        // The high-water mark prevents extending 15-minute tokens by simply
        // setting the clock backwards. Written synchronously every minute
        // while Pro is queried; an unverifiable clock is Free.
        val high = prefs.getLong(KEY_MAX_WALL_CLOCK, 0L)
        if (high > nowMillis + 30_000L) return false
        val token = prefs.getString(KEY_SIGNED_TOKEN, null)
        if (verifiedExpirationSeconds(token, publicKeyBase64, nowMillis) == null) return false
        if (nowMillis > high + 60_000L) {
            if (!prefs.edit().putLong(KEY_MAX_WALL_CLOCK, nowMillis).commit()) return false
        }
        return true
    }

    fun install(
        prefs: SharedPreferences,
        signed: String,
        publicKeyBase64: String,
        nowMillis: Long = System.currentTimeMillis(),
    ): Boolean {
        if (verifiedExpirationSeconds(signed, publicKeyBase64, nowMillis) == null) return false
        if (prefs.getLong(KEY_MAX_WALL_CLOCK, 0L) > nowMillis + 30_000L) return false
        return prefs.edit()
            .putString(KEY_SIGNED_TOKEN, signed)
            .putLong(KEY_MAX_WALL_CLOCK, nowMillis)
            .commit()
    }

    fun clear(prefs: SharedPreferences): Boolean =
        prefs.edit().remove(KEY_SIGNED_TOKEN).commit()
}
