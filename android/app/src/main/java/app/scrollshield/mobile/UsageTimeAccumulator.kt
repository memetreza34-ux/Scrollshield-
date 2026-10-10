package app.scrollshield.mobile

/** Signals relevant to time accounting, independent of Android's UsageEvents API. */
internal enum class UsageSignal {
    FOREGROUND,
    BACKGROUND,
    SCREEN_OFF,
    DEVICE_SHUTDOWN,
    DEVICE_STARTUP,
}

/** Global device events do not necessarily contain an Android package name. */
internal data class UsageObservation(
    val timeMillis: Long,
    val packageName: String?,
    val signal: UsageSignal,
)

/**
 * Counts only time a protected app is in the foreground while the screen is on.
 * Screen-off/shutdown events close intervals even when their packageName is null.
 * Missing resume events after waking may undercount, but must never produce an
 * invented overnight interval that prematurely triggers a daily limit.
 */
internal class ProtectedUsageAccumulator(private val protectedPackages: Set<String>) {
    private val resumed = mutableMapOf<String, Int>()
    private val since = mutableMapOf<String, Long>()
    private val totals = mutableMapOf<String, Long>()

    private fun closeAll(at: Long) {
        for ((pkg, started) in since) {
            totals[pkg] = (totals[pkg] ?: 0L) + (at - started).coerceAtLeast(0L)
        }
        since.clear()
        resumed.clear()
    }

    fun accept(event: UsageObservation) {
        if (event.signal == UsageSignal.SCREEN_OFF ||
            event.signal == UsageSignal.DEVICE_SHUTDOWN ||
            event.signal == UsageSignal.DEVICE_STARTUP
        ) {
            closeAll(event.timeMillis)
            return
        }

        val pkg = event.packageName ?: return
        if (pkg !in protectedPackages) {
            if (event.signal == UsageSignal.FOREGROUND) closeAll(event.timeMillis)
            return
        }

        when (event.signal) {
            UsageSignal.FOREGROUND -> {
                if (since.keys.any { it != pkg }) closeAll(event.timeMillis)
                val count = resumed[pkg] ?: 0
                if (count == 0) since[pkg] = event.timeMillis
                resumed[pkg] = count + 1
            }
            UsageSignal.BACKGROUND -> {
                val count = resumed[pkg] ?: 0
                if (count == 1) {
                    since.remove(pkg)?.let { started ->
                        totals[pkg] = (totals[pkg] ?: 0L) + (event.timeMillis - started).coerceAtLeast(0L)
                    }
                    resumed.remove(pkg)
                } else if (count > 1) {
                    resumed[pkg] = count - 1
                }
            }
            else -> Unit
        }
    }

    fun minutesAt(now: Long): Map<String, Int> = protectedPackages.associateWith { pkg ->
        val openMillis = since[pkg]?.let { (now - it).coerceAtLeast(0L) } ?: 0L
        ((totals[pkg] ?: 0L) + openMillis).div(60_000L).coerceAtMost(Int.MAX_VALUE.toLong()).toInt()
    }
}

/** Total display-on foreground time; excludes home screens and system UI. */
internal class ScreenTimeAccumulator(private val excludedPackages: Set<String>) {
    private var current: String? = null
    private var resumedCount = 0
    private var since = 0L
    private var total = 0L

    private fun close(at: Long) {
        if (current != null) total += (at - since).coerceAtLeast(0L)
        current = null
        resumedCount = 0
    }

    fun accept(event: UsageObservation) {
        if (event.signal == UsageSignal.SCREEN_OFF ||
            event.signal == UsageSignal.DEVICE_SHUTDOWN ||
            event.signal == UsageSignal.DEVICE_STARTUP
        ) {
            close(event.timeMillis)
            return
        }

        val pkg = event.packageName ?: return
        when (event.signal) {
            UsageSignal.FOREGROUND -> {
                if (pkg == current) {
                    resumedCount++
                } else {
                    close(event.timeMillis)
                    if (pkg !in excludedPackages) {
                        current = pkg
                        resumedCount = 1
                        since = event.timeMillis
                    }
                }
            }
            UsageSignal.BACKGROUND -> {
                if (pkg == current) {
                    resumedCount--
                    if (resumedCount <= 0) close(event.timeMillis)
                }
            }
            else -> Unit
        }
    }

    fun minutesAt(endTime: Long): Int {
        val tail = if (current != null) (endTime - since).coerceAtLeast(0L) else 0L
        return ((total + tail) / 60_000L).coerceAtMost(Int.MAX_VALUE.toLong()).toInt()
    }
}
