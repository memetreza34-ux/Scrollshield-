/**
 * Authoritative subscription evaluation for server-verified Google Play data.
 * Never trust a state, expiry, product ID, or signature supplied by the client.
 *
 * Note: cancelled subscriptions retain access until the paid expiry. Grace
 * period retains access; on-hold, paused and pending subscriptions do not.
 */
export const PLAY_PACKAGE = 'app.scrollshield.mobile';
export const PLAY_PRODUCT = 'scrollshield_pro';

export const ACCESS_STATES = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  'SUBSCRIPTION_STATE_CANCELED',
]);

export function evaluatePlaySubscription(raw, now = Date.now(), productId = PLAY_PRODUCT) {
  const state = typeof raw?.subscriptionState === 'string' ? raw.subscriptionState : 'UNKNOWN';
  const matching = Array.isArray(raw?.lineItems)
    ? raw.lineItems.filter((item) => item?.productId === productId)
    : [];
  const validExpirations = matching
    .map((item) => Date.parse(item?.expiryTime ?? ''))
    .filter((time) => Number.isFinite(time) && time > now);
  const expiryEpochMs = validExpirations.length ? Math.max(...validExpirations) : null;
  const active = ACCESS_STATES.has(state) && expiryEpochMs !== null;

  return {
    active,
    state,
    expiryEpochMs,
    productId,
    // Status-only: the client must never be given raw Play data, receipts or token.
    verification: 'google_play_api',
  };
}

/** Validate a finite, bounded token without ever printing its contents. */
export function validPurchaseToken(value) {
  return typeof value === 'string' && value.length >= 16 && value.length <= 4096 &&
    /^[\w.:-]+$/.test(value);
}

export function safePublicEntitlement(result) {
  return {
    pro: result.active === true,
    state: result.state,
    expiresAt: result.expiryEpochMs !== null ? new Date(result.expiryEpochMs).toISOString() : null,
    source: 'verified_google_play',
  };
}
