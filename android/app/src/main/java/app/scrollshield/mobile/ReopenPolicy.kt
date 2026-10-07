package app.scrollshield.mobile

data class ReopenDecision(
    val blocked: Boolean,
    val warning: Boolean,
    val delaySeconds: Int,
)

/**
 * Pure decision helper for Adaptive Reopen Protection.
 *
 * Counts represent previous conscious app entries in the configured windows.
 * The current attempt is evaluated against those counts before it is recorded.
 */
object ReopenPolicy {
    fun decide(
        warningOpenCount: Int,
        blockOpenCount: Int,
        warningThreshold: Int,
        blockThreshold: Int,
        baseDelaySeconds: Int,
        escalationSeconds: Int,
        maxDelaySeconds: Int,
    ): ReopenDecision {
        if (blockThreshold > 0 && blockOpenCount >= blockThreshold) {
            return ReopenDecision(blocked = true, warning = false, delaySeconds = baseDelaySeconds.coerceAtLeast(0))
        }

        if (warningThreshold > 0 && warningOpenCount >= warningThreshold) {
            val delay = (baseDelaySeconds.coerceAtLeast(0) +
                warningOpenCount.coerceAtLeast(0) * escalationSeconds.coerceAtLeast(0))
                .coerceAtMost(maxDelaySeconds.coerceAtLeast(0))
            return ReopenDecision(blocked = false, warning = true, delaySeconds = delay)
        }

        return ReopenDecision(
            blocked = false,
            warning = false,
            delaySeconds = baseDelaySeconds.coerceAtLeast(0),
        )
    }
}
