package app.scrollshield.mobile

/**
 * Uses real, previous accepted app openings only.
 *
 * Usage time is wall-clock time because the ledger survives process restarts.
 * A backwards manual clock change must not treat timestamps in the future as
 * previous openings and immediately escalate or block an app.
 */
internal object OpenWindowPolicy {
    fun countPreviousOpenings(openings: List<Long>, now: Long, windowMinutes: Int): Int {
        if (windowMinutes <= 0) return 0
        val startExclusive = now - windowMinutes.toLong() * 60_000L
        return openings.count { it > startExclusive && it <= now }
    }
}
