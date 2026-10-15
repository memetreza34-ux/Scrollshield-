package app.scrollshield.mobile

import android.content.Context
import android.media.AudioManager

/**
 * Whether a phone or internet call is ringing or running. Read from the audio
 * mode, which needs no permission: the system sets MODE_RINGTONE, MODE_IN_CALL
 * and MODE_CALL_SCREENING for phone calls, call and video apps set
 * MODE_IN_COMMUNICATION.
 *
 * Nothing interrupts a call: an overlay could hide the buttons to answer or
 * hang up.
 */
object CallState {

    @Suppress("InlinedApi") // A plain int; older Android never reports it.
    fun isActive(context: Context): Boolean {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return false
        return when (audioManager.mode) {
            AudioManager.MODE_RINGTONE,
            AudioManager.MODE_IN_CALL,
            AudioManager.MODE_IN_COMMUNICATION,
            AudioManager.MODE_CALL_SCREENING -> true
            else -> false
        }
    }
}
