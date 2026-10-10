package app.scrollshield.mobile

/**
 * Android UsageEvents queries overlap: the same event is returned on multiple
 * monitor polls. Keep one stateful cursor, not "the last RESUMED in 15 seconds",
 * or an app that has already PAUSED may be mistaken for the foreground app.
 *
 * This class deliberately has no Android dependencies so transition sequences
 * can be covered by local JVM tests.
 */
internal enum class ForegroundTransitionKind {
    RESUMED,
    PAUSED,
    SCREEN_OFF,
    DEVICE_SHUTDOWN,
    DEVICE_STARTUP,
}

internal data class ForegroundTransition(
    val timestampMillis: Long,
    val kind: ForegroundTransitionKind,
    val packageName: String? = null,
)

internal class ForegroundTransitionTracker {
    private var latestTimestampMillis = Long.MIN_VALUE
    private val seenAtLatestTimestamp = mutableSetOf<Pair<ForegroundTransitionKind, String?>>()

    var currentPackage: String? = null
        private set

    /**
     * Pass events in UsageEvents' chronological order. Replays of a transition
     * already observed at the cursor are ignored. Pausing a *different* package
     * cannot hide the current foreground app (multi-activity Android behavior).
     */
    fun accept(event: ForegroundTransition) {
        if (event.kind == ForegroundTransitionKind.RESUMED ||
            event.kind == ForegroundTransitionKind.PAUSED
        ) {
            if (event.packageName.isNullOrBlank()) return
        }

        if (event.timestampMillis < latestTimestampMillis) return
        if (event.timestampMillis > latestTimestampMillis) {
            latestTimestampMillis = event.timestampMillis
            seenAtLatestTimestamp.clear()
        }

        if (!seenAtLatestTimestamp.add(event.kind to event.packageName)) return

        when (event.kind) {
            ForegroundTransitionKind.RESUMED -> currentPackage = event.packageName
            ForegroundTransitionKind.PAUSED -> {
                if (currentPackage == event.packageName) currentPackage = null
            }
            ForegroundTransitionKind.SCREEN_OFF,
            ForegroundTransitionKind.DEVICE_SHUTDOWN,
            ForegroundTransitionKind.DEVICE_STARTUP -> currentPackage = null
        }
    }

    /**
     * Called when PowerManager says the device is locked, independently of the
     * last usage event. Do not replay stale RESUMED events on the next poll.
     */
    fun resetCurrent() {
        currentPackage = null
    }
}
