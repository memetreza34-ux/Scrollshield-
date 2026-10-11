package app.scrollshield.mobile

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Firebase sign-in and recovery boundary. Firebase Auth owns refresh tokens,
 * not WebView or ScrollShield backups. Email/password are transient inputs.
 * This plugin never returns Firebase JWTs to JavaScript.
 */
@CapacitorPlugin(name = "ScrollShieldIdentity")
class ScrollShieldIdentityPlugin : Plugin() {
    private fun auth() = NativeBillingIdentity.auth(context)

    private fun status(call: PluginCall) {
        val (configured, email, verified) = NativeBillingIdentity.status(context)
        call.resolve(JSObject()
            .put("configured", configured)
            .put("signedIn", email != null)
            .put("email", email)
            .put("verified", verified))
    }

    @PluginMethod
    fun getStatus(call: PluginCall) = status(call)

    @PluginMethod
    fun refreshStatus(call: PluginCall) {
        val user = auth()?.currentUser
        if (user == null) {
            status(call)
            return
        }
        user.reload()
            .addOnCompleteListener { result ->
                if (result.isSuccessful) status(call)
                else call.reject("Kontostatus konnte nicht aktualisiert werden.", "IDENTITY_REFRESH_FAILED")
            }
    }

    @PluginMethod
    fun createAccount(call: PluginCall) {
        val firebase = auth()
        val email = call.getString("email")?.trim().orEmpty()
        val password = call.getString("password").orEmpty()
        if (firebase == null || email.length !in 5..254 || password.length !in 8..128) {
            call.reject("Firebase fehlt oder ungültige Anmeldedaten.", "IDENTITY_NOT_CONFIGURED")
            return
        }
        val previousUid = firebase.currentUser?.uid
        firebase.createUserWithEmailAndPassword(email, password)
            .addOnCompleteListener { task ->
                if (!task.isSuccessful) {
                    call.reject("Konto konnte nicht erstellt werden.", "IDENTITY_SIGNUP_FAILED")
                    return@addOnCompleteListener
                }
                if (previousUid != firebase.currentUser?.uid) {
                    NativeProEntitlement.clear(SecurePrefs.open(context))
                    AppMonitorService.notifyConfigUpdate(context)
                }
                firebase.currentUser?.sendEmailVerification()
                // Registration does not grant Pro until email verification.
                status(call)
            }
    }

    @PluginMethod
    fun signIn(call: PluginCall) {
        val firebase = auth()
        val email = call.getString("email")?.trim().orEmpty()
        val password = call.getString("password").orEmpty()
        if (firebase == null || email.length !in 5..254 || password.isEmpty()) {
            call.reject("Anmeldung nicht verfügbar.", "IDENTITY_NOT_CONFIGURED")
            return
        }
        val previousUid = firebase.currentUser?.uid
        firebase.signInWithEmailAndPassword(email, password)
            .addOnCompleteListener { task ->
                if (!task.isSuccessful) {
                    call.reject("Anmeldung fehlgeschlagen.", "IDENTITY_SIGNIN_FAILED")
                    return@addOnCompleteListener
                }
                if (previousUid != firebase.currentUser?.uid) {
                    NativeProEntitlement.clear(SecurePrefs.open(context))
                    AppMonitorService.notifyConfigUpdate(context)
                }
                status(call)
                if (NativeBillingIdentity.currentUid(context) != null) {
                    NativePlayRefreshCoordinator.maybeRefresh(context, force = true)
                }
            }
    }

    @PluginMethod
    fun sendVerificationEmail(call: PluginCall) {
        val user = auth()?.currentUser
        if (user == null) {
            call.reject("Bitte zuerst anmelden.", "IDENTITY_NOT_SIGNED_IN")
            return
        }
        user.sendEmailVerification().addOnCompleteListener { task ->
            if (task.isSuccessful) call.resolve(JSObject().put("sent", true))
            else call.reject("Bestätigungs-E-Mail konnte nicht versendet werden.", "IDENTITY_EMAIL_FAILED")
        }
    }

    @PluginMethod
    fun requestPasswordReset(call: PluginCall) {
        val email = call.getString("email")?.trim().orEmpty()
        if (auth() == null || email.length !in 5..254) {
            call.reject("Bitte eine gültige E-Mail-Adresse eingeben.", "IDENTITY_RESET_INVALID")
            return
        }
        // Do not reveal account existence; Firebase project should also
        // enable email enumeration protection in the console.
        auth()!!.sendPasswordResetEmail(email).addOnCompleteListener {
            call.resolve(JSObject().put("requested", true))
        }
    }

    @PluginMethod
    fun signOut(call: PluginCall) {
        NativeBillingIdentity.signOut(context)
        NativePlayRefreshCoordinator.resetAfterSignOut()
        status(call)
    }
}
