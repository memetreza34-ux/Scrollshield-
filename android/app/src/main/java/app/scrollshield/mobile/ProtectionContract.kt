package app.scrollshield.mobile

/**
 * Version boundary between the React/Capacitor layer and native enforcement.
 *
 * Version bumps must be deliberate and backwards-compatible or migrated.
 */
object ProtectionContract {
    const val VERSION = 1

    fun isSupported(version: Int): Boolean = version == VERSION
}
