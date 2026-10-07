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
            val baseDelay = baseDelaySeconds.coerceAtLeast(0)
            // Reopen friction must never become weaker than the configured base pause.
            // If a future/custom base delay exceeds the normal escalation cap, the base wins.
            val effectiveMaxDelay = maxOf(maxDelaySeconds.coerceAtLeast(0), baseDelay)
            val delay = (baseDelay +
                warningOpenCount.coerceAtLeast(0) * escalationSeconds.coerceAtLeast(0))
                .coerceAtMost(effectiveMaxDelay)
            return ReopenDecision(blocked = false, warning = true, delaySeconds = delay)
        }

        return ReopenDecision(
            blocked = false,
            warning = false,
            delaySeconds = baseDelaySeconds.coerceAtLeast(0),
        )
    }
}
