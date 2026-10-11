package app.scrollshield.mobile

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.Signature
import android.util.Base64

@RunWith(AndroidJUnit4::class)
class NativeProEntitlementInstrumentedTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext

    private val testUid = "ss405-test-account"

    private fun signedToken(now: Long, ttlSeconds: Long = 600): Pair<String, String> {
        val keyPair = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
        val payload = JSONObject()
            .put("v", 1).put("aud", "app.scrollshield.mobile")
            .put("sub", MessageDigest.getInstance("SHA-256")
                .digest(("scrollshield-uid-v1:" + testUid).toByteArray(Charsets.UTF_8))
                .joinToString("") { "%02x".format(it.toInt() and 0xff) })
            .put("plan", "pro").put("pro", true)
            .put("iat", now / 1000L)
            .put("exp", now / 1000L + ttlSeconds)
            .toString()
        val message = "SS1." + Base64.encodeToString(
            payload.toByteArray(Charsets.UTF_8),
            Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING,
        )
        val signer = Signature.getInstance("SHA256withRSA")
        signer.initSign(keyPair.private)
        signer.update(message.toByteArray(Charsets.UTF_8))
        val token = message + "." + Base64.encodeToString(
            signer.sign(), Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING,
        )
        val spki = Base64.encodeToString(keyPair.public.encoded, Base64.NO_WRAP)
        return token to spki
    }

    @Test
    fun validTokenCanBeInstalledAndExpiresOnTime() {
        val now = 2_000_000_000_000L
        val (token, publicKey) = signedToken(now)
        val prefs = context.getSharedPreferences("ss404-entitlement-test", Context.MODE_PRIVATE)
        prefs.edit().clear().commit()
        assertTrue(NativeProEntitlement.install(prefs, token, publicKey, testUid, now))
        assertTrue(NativeProEntitlement.isActive(prefs, publicKey, testUid, now + 30_000L))
        assertFalse(NativeProEntitlement.isActive(prefs, publicKey, testUid, now + 601_000L))
        assertFalse(NativeProEntitlement.isActive(prefs, publicKey, "wrong-account", now + 30_000L))
        prefs.edit().clear().commit()
    }

    @Test
    fun tamperedTokenWrongKeyAndClockRollbackCannotUnlockPro() {
        val now = 2_000_000_000_000L
        val (token, publicKey) = signedToken(now)
        val (other, wrongKey) = signedToken(now)
        assertNotNull(NativeProEntitlement.verifiedExpirationSeconds(token, publicKey, now, testUid))
        assertNull(NativeProEntitlement.verifiedExpirationSeconds(token, wrongKey, now, testUid))
        assertNull(NativeProEntitlement.verifiedExpirationSeconds(
            token.replace("SS1.", "SS0."), publicKey, now, testUid
        ))
        assertNull(NativeProEntitlement.verifiedExpirationSeconds(
            token.dropLast(10) + "invalidsig", publicKey, now, testUid
        ))
        assertNull(NativeProEntitlement.verifiedExpirationSeconds(other, "", now, testUid))
        val prefs = context.getSharedPreferences("ss404-entitlement-test", Context.MODE_PRIVATE)
        prefs.edit().clear().commit()
        assertTrue(NativeProEntitlement.install(prefs, token, publicKey, testUid, now))
        assertTrue(NativeProEntitlement.isActive(prefs, publicKey, testUid, now + 90_000L))
        assertFalse(NativeProEntitlement.isActive(prefs, publicKey, testUid, now - 60_000L))
        prefs.edit().clear().commit()
    }

    @Test
    fun nativeFreeProjectionIgnoresSpoofedAppIdsAndPaidFields() {
        val raw = org.json.JSONArray()
        fun add(pkg: String, id: String): Unit {
            raw.put(JSONObject().put("packageName", pkg).put("appId", id)
                .put("mode", "strict").put("delaySeconds", 300)
                .put("sessionLimitMinutes", 30).put("dailyLimitMinutes", 20)
                .put("emergencyUnlock", JSONObject().put("maxPerDay", 0)))
        }
        add("com.instagram.android", "same-faked-app")
        add("com.zhiliaoapp.musically", "same-faked-app")
        add("com.google.android.youtube", "same-faked-app")
        add("fake.unlisted", "same-faked-app")
        val result = NativeFreeRules.project(raw, hasSignedPro = false)
        assertEquals(2, result.length())
        for (i in 0 until result.length()) {
            val item = result.getJSONObject(i)
            assertEquals("standard", item.getString("mode"))
            assertEquals(5, item.getInt("delaySeconds"))
            assertFalse(item.has("sessionLimitMinutes"))
            assertFalse(item.has("dailyLimitMinutes"))
            assertEquals(2, item.getJSONObject("emergencyUnlock").getInt("maxPerDay"))
        }
        assertEquals(4, NativeFreeRules.project(raw, hasSignedPro = true).length())
    }

    @Test
    fun malformedNativePreferenceTypeCannotLeavePaidRulesEnabled() {
        val now = 2_000_000_000_000L
        val (token, key) = signedToken(now)
        val prefs = context.getSharedPreferences("ss404-entitlement-test", Context.MODE_PRIVATE)
        prefs.edit().clear().putString(NativeProEntitlement.KEY_MAX_WALL_CLOCK, "corrupt").commit()
        assertFalse(NativeProEntitlement.install(prefs, token, key, testUid, now))
        assertFalse(NativeProEntitlement.isActive(prefs, key, testUid, now))
        prefs.edit().clear().commit()
    }

    @Test
    fun legacyPackageListStillGetsFreeClamping() {
        val legacy = org.json.JSONArray()
            .put("com.instagram.android")
            .put("com.zhiliaoapp.musically")
            .put("com.google.android.youtube")
        val rules = NativeFreeRules.project(legacy, false)
        assertEquals(2, rules.length())
        assertEquals("instagram", rules.getJSONObject(0).getString("appId"))
        assertEquals("tiktok", rules.getJSONObject(1).getString("appId"))
    }

    @Test
    fun oneFreeScheduleCanApplyToBothAppsButExtraWindowsCannot() {
        val raw = org.json.JSONArray()
        for (pkg in listOf("com.instagram.android", "com.zhiliaoapp.musically")) {
            raw.put(JSONObject().put("packageName", pkg).put("timeWindows", JSONObject()
                .put("windows", org.json.JSONArray()
                    .put(JSONObject().put("startHour", 21).put("endHour", 7).put("rule", "block"))
                    .put(JSONObject().put("startHour", 10).put("endHour", 12).put("rule", "strict")))))
        }
        val result = NativeFreeRules.project(raw, false)
        assertEquals(2, result.length())
        for (i in 0 until result.length()) {
            val schedule = result.getJSONObject(i).getJSONObject("timeWindows")
            assertEquals(1, schedule.getJSONArray("windows").length())
        }
    }
}
