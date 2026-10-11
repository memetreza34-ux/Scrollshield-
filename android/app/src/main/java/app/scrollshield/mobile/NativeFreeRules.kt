package app.scrollshield.mobile

import org.json.JSONArray
import org.json.JSONObject

/**
 * Defense-in-depth for the native Android service. JS localStorage and
 * syncBlockedApps payloads are user-controlled: NEVER allow either to declare
 * paid privileges without a verified server-signed Pro grant.
 */
internal object NativeFreeRules {
    private val knownApps = mapOf(
        "com.instagram.android" to "instagram",
        "com.instagram.lite" to "instagram",
        "com.zhiliaoapp.musically" to "tiktok",
        "com.ss.android.ugc.trill" to "tiktok",
        "com.zhiliaoapp.musically.go" to "tiktok",
        "com.google.android.youtube" to "youtube",
        "com.google.android.apps.youtube.mango" to "youtube",
        "com.facebook.katana" to "facebook",
        "com.facebook.lite" to "facebook",
        "com.twitter.android" to "twitter",
        "com.twitter.android.lite" to "twitter",
        "com.snapchat.android" to "snapchat",
        "com.reddit.frontpage" to "reddit",
        "com.reddit.frontpage.lite" to "reddit",
        "com.pinterest" to "pinterest",
    )

    fun trustedAppId(packageName: String): String? = knownApps[packageName]

    fun firstTwoSupportedAppIds(packages: List<String>): Set<String> =
        packages.mapNotNull(::trustedAppId).distinct().take(2).toSet()

    /** Only ONE time window survives; Pro's multiple schedules need a grant. */
    fun project(raw: JSONArray, hasSignedPro: Boolean, nowMillis: Long = System.currentTimeMillis()): JSONArray {
        if (hasSignedPro) return raw

        val packages = (0 until raw.length()).mapNotNull {
            raw.optJSONObject(it)?.optString("packageName")?.takeIf(String::isNotEmpty)
        }
        val allowed = firstTwoSupportedAppIds(packages)
        val output = JSONArray()
        var scheduleUsed = false

        for (index in 0 until raw.length()) {
            val original = raw.optJSONObject(index) ?: continue
            val packageName = original.optString("packageName")
            val trustedId = trustedAppId(packageName) ?: continue
            if (trustedId !in allowed) continue

            val isSoft = original.optString("mode") == "soft"
            val safe = JSONObject()
                .put("packageName", packageName)
                .put("appId", trustedId)
                .put("mode", if (isSoft) "soft" else "standard")
                .put("delaySeconds", if (isSoft) 3 else 5)
                .put("emergencyUnlock", JSONObject()
                    .put("maxPerDay", 2)
                    .put("durationMinutes", 5))
            if (!isSoft) {
                safe.put("antiBinge", JSONObject()
                    .put("warningThreshold", 1)
                    .put("warningTimeframe", 10)
                    .put("blockThreshold", 99)
                    .put("blockTimeframe", 30)
                    .put("escalationSeconds", 10))
            }
            // Free focus is allowed but limited to one hour at sync time.
            val focusUntil = original.optLong("focusUntil", 0L)
            if (focusUntil > nowMillis && focusUntil <= nowMillis + 3_600_000L) {
                safe.put("focusUntil", focusUntil)
            }
            if (!scheduleUsed) {
                val schedule = original.optJSONObject("timeWindows")
                val windows = schedule?.optJSONArray("windows")
                if (windows != null && windows.length() > 0) {
                    val first = windows.optJSONObject(0)
                    if (first != null) {
                        val start = first.optInt("startHour", -1)
                        val end = first.optInt("endHour", -1)
                        val mode = first.optString("rule")
                        if (start in 0..23 && end in 0..24 && start != end &&
                            mode in setOf("strict", "block")) {
                            safe.put("timeWindows", JSONObject()
                                .put("windows", JSONArray().put(JSONObject()
                                    .put("startHour", start).put("endHour", end).put("rule", mode)))
                                .put("weekendRule", "normal"))
                            scheduleUsed = true
                        }
                    }
                }
            }
            output.put(safe)
        }
        return output
    }
}
