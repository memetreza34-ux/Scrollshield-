package app.scrollshield.mobile

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeBillingPolicyTest {
    @Test
    fun noServerMeansBillingVerificationIsUnavailable() {
        assertNull(NativeBillingPolicy.normalizedHttpsBase(""))
        assertFalse(NativeBillingPolicy.canBeginVerification("a".repeat(50), ""))
    }

    @Test
    fun httpsCloudRunHostnameIsAccepted() {
        assertEquals("https://scrollshield-billing-abcdef.a.run.app",
            NativeBillingPolicy.normalizedHttpsBase("https://scrollshield-billing-abcdef.a.run.app"))
        assertEquals("https://example.com",
            NativeBillingPolicy.normalizedHttpsBase("https://example.com/"))
    }

    @Test
    fun httpAndLocalhostCannotOverrideProductionVerification() {
        assertNull(NativeBillingPolicy.normalizedHttpsBase("http://example.com"))
        assertNull(NativeBillingPolicy.normalizedHttpsBase("http://localhost:8080"))
    }

    @Test
    fun credentialInjectionAndRedirectStyleUrlsAreRejected() {
        assertNull(NativeBillingPolicy.normalizedHttpsBase("https://someone:secret@example.com"))
        assertNull(NativeBillingPolicy.normalizedHttpsBase("https://example.com/path"))
        assertNull(NativeBillingPolicy.normalizedHttpsBase("https://example.com?url=https://evil.com"))
        assertNull(NativeBillingPolicy.normalizedHttpsBase("https://example.com/#page"))
    }

    @Test
    fun malformedHostAndWhitespaceCannotEnableBilling() {
        assertNull(NativeBillingPolicy.normalizedHttpsBase(" https://example.com"))
        assertNull(NativeBillingPolicy.normalizedHttpsBase("https://example.com "))
        assertNull(NativeBillingPolicy.normalizedHttpsBase("not-a-url"))
    }

    @Test
    fun backendNeedsTransientSignedIdentityToken() {
        assertFalse(NativeBillingPolicy.canBeginVerification(null, "https://example.com"))
        assertFalse(NativeBillingPolicy.canBeginVerification("", "https://example.com"))
        assertFalse(NativeBillingPolicy.canBeginVerification("x".repeat(9000), "https://example.com"))
        assertTrue(NativeBillingPolicy.canBeginVerification("x".repeat(50), "https://example.com"))
    }

    @Test
    fun googlePlayAccountIdMustBeExactlySha256Hex() {
        assertTrue(NativeBillingPolicy.validAccountBinding("a".repeat(64)))
        assertFalse(NativeBillingPolicy.validAccountBinding("A".repeat(64)))
        assertFalse(NativeBillingPolicy.validAccountBinding("a".repeat(63)))
        assertFalse(NativeBillingPolicy.validAccountBinding("a".repeat(65)))
    }

    @Test
    fun purchaseTokenNeverAcceptsNewlinesOrUnboundedContent() {
        assertTrue(NativeBillingPolicy.validPurchaseToken("token_1234567890-valid"))
        assertFalse(NativeBillingPolicy.validPurchaseToken("short"))
        assertFalse(NativeBillingPolicy.validPurchaseToken("x".repeat(4097)))
        assertFalse(NativeBillingPolicy.validPurchaseToken("1234567890123456\nsecret"))
    }

    @Test
    fun onlyBackendVerifiedSourceAndKnownStateShapeAreRecognized() {
        assertTrue(NativeBillingPolicy.isVerifiedStatusResponse(
            "verified_google_play", "SUBSCRIPTION_STATE_ACTIVE"))
        assertFalse(NativeBillingPolicy.isVerifiedStatusResponse(
            "client", "SUBSCRIPTION_STATE_ACTIVE"))
        assertFalse(NativeBillingPolicy.isVerifiedStatusResponse(
            "verified_google_play", "true"))
    }
}
