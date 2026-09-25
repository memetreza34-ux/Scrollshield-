package app.scrollshield.mobile

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * The encrypted preferences file shared by the plugin, both services and the
 * boot receiver. All of them must open the same file the same way.
 */
object SecurePrefs {
    fun open(context: Context): SharedPreferences {
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                ScrollShieldBridgePlugin.PREF_FILE,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (_: Exception) {
            // Fallback to plain prefs if the security provider is unavailable (emulators)
            context.getSharedPreferences(ScrollShieldBridgePlugin.PREF_FILE, Context.MODE_PRIVATE)
        }
    }
}
