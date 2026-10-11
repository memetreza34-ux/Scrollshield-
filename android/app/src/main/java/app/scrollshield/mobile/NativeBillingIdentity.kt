package app.scrollshield.mobile

import android.content.Context
import com.google.android.gms.tasks.Task
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser

/**
 * Recoverable native-only Firebase email/password identity. Firebase persists
 * its own refresh credentials; raw auth tokens are NEVER sent into WebView,
 * SharedPreferences, app export files or JS state.
 *
 * All public Firebase config belongs in BuildConfig. A missing Firebase
 * project deliberately disables accounts and paid subscriptions.
 */
internal object NativeBillingIdentity {
    @Synchronized
    fun auth(context: Context): FirebaseAuth? {
        val projectId = BuildConfig.SCROLLSHIELD_FIREBASE_PROJECT_ID
        val appId = BuildConfig.SCROLLSHIELD_FIREBASE_APP_ID
        val key = BuildConfig.SCROLLSHIELD_FIREBASE_API_KEY
        if (projectId.isBlank() || appId.isBlank() || key.isBlank()) return null
        return try {
            val app = FirebaseApp.getApps(context).firstOrNull { it.name == "scrollshield-billing" }
                ?: FirebaseApp.initializeApp(
                    context.applicationContext,
                    FirebaseOptions.Builder()
                        .setApplicationId(appId)
                        .setApiKey(key)
                        .setProjectId(projectId)
                        .build(),
                    "scrollshield-billing",
                )
            FirebaseAuth.getInstance(app)
        } catch (_: Exception) {
            null
        }
    }

    fun verifiedUser(context: Context): FirebaseUser? =
        auth(context)?.currentUser?.takeIf { it.isEmailVerified && !it.isAnonymous }

    fun currentUid(context: Context): String? = verifiedUser(context)?.uid

    fun getVerifiedIdToken(context: Context, onResult: (String?) -> Unit) {
        val user = verifiedUser(context)
        if (user == null) {
            onResult(null)
            return
        }
        user.getIdToken(false)
            .addOnSuccessListener { result ->
                // UID may change while Firebase refresh is in progress.
                if (currentUid(context) == user.uid) onResult(result.token) else onResult(null)
            }
            .addOnFailureListener { onResult(null) }
    }

    fun status(context: Context): Triple<Boolean, String?, Boolean> {
        val auth = auth(context) ?: return Triple(false, null, false)
        val user = auth.currentUser
        return Triple(true, user?.email, user?.isEmailVerified == true && !user.isAnonymous)
    }

    fun signOut(context: Context) {
        // Remove paid access BEFORE invalidating the identity; not after.
        NativeProEntitlement.clear(SecurePrefs.open(context))
        auth(context)?.signOut()
        AppMonitorService.notifyConfigUpdate(context)
    }
}
