package app.scrollshield.mobile

/** Pure rules shared by the persisted emergency-unlock ledger and the overlay. */
internal object EmergencyGrantPolicy {
    /** No imported or malformed setting may create an unlimited unlock. */
    fun canGrant(usedToday: Int, maxPerDay: Int, durationMinutes: Int): Boolean =
        usedToday >= 0 &&
            maxPerDay in 1..20 &&
            durationMinutes in 1..60 &&
            usedToday < maxPerDay

    fun expiresAt(nowEpochMillis: Long, durationMinutes: Int): Long =
        nowEpochMillis + durationMinutes.toLong() * 60_000L

    fun isActive(untilEpochMillis: Long, nowEpochMillis: Long): Boolean =
        untilEpochMillis > 0L && nowEpochMillis < untilEpochMillis
}
