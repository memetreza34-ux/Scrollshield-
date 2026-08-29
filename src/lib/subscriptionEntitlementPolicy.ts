import {
  SUBSCRIPTION_PLAN_POLICY,
  isSubscriptionPlanId,
  type SubscriptionPlanId,
} from './subscriptionPlanPolicy';

export type SubscriptionLifecycleState =
  | 'active'
  | 'grace'
  | 'pending'
  | 'expired'
  | 'revoked'
  | 'unknown';

export interface BackendEntitlementCandidate {
  schemaVersion?: unknown;
  plan?: unknown;
  lifecycleState?: unknown;
  cryptographicallyVerified?: unknown;
  issuedAtMs?: unknown;
  validUntilMs?: unknown;
}

export interface EffectiveSubscriptionEntitlement {
  plan: SubscriptionPlanId;
  lifecycleState: SubscriptionLifecycleState;
  source: 'free-default' | 'verified-backend-assertion';
  validUntilMs: number | null;
  reason:
    | 'free-default'
    | 'verified-active'
    | 'verified-grace'
    | 'missing-or-malformed'
    | 'unverified'
    | 'unsupported-plan'
    | 'non-entitling-lifecycle'
    | 'invalid-time-window'
    | 'expired-cache'
    | 'offline-window-too-long';
}

export interface ProtectedAppCapacityDecision {
  limit: number | null;
  selectedActiveAppIds: string[];
  pausedAppIds: string[];
  requiresUserChoice: boolean;
  reason: 'within-limit' | 'selection-required' | 'explicit-selection-applied' | 'unlimited';
}

export const MAX_OFFLINE_ENTITLEMENT_WINDOW_MS = 72 * 60 * 60 * 1000;
export const MAX_ENTITLEMENT_CLOCK_SKEW_MS = 5 * 60 * 1000;

const FREE_ENTITLEMENT: EffectiveSubscriptionEntitlement = {
  plan: 'free',
  lifecycleState: 'unknown',
  source: 'free-default',
  validUntilMs: null,
  reason: 'free-default',
};

const isFinitePositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const normalizeLifecycleState = (value: unknown): SubscriptionLifecycleState => {
  if (
    value === 'active' ||
    value === 'grace' ||
    value === 'pending' ||
    value === 'expired' ||
    value === 'revoked'
  ) {
    return value;
  }
  return 'unknown';
};

const freeWithReason = (
  reason: Exclude<EffectiveSubscriptionEntitlement['reason'], 'verified-active' | 'verified-grace'>,
  lifecycleState: SubscriptionLifecycleState = 'unknown',
): EffectiveSubscriptionEntitlement => ({
  ...FREE_ENTITLEMENT,
  lifecycleState,
  reason,
});

/**
 * Resolves only a cryptographically verified backend assertion into paid access.
 *
 * `cryptographicallyVerified` is a security boundary, not a local preference flag.
 * The future billing/backend adapter must set it only after validating a signed
 * backend assertion. Persisted JSON, query parameters, localStorage, SharedPreferences
 * or a raw Google Play purchase result must never set paid access directly.
 */
export const resolveEffectiveSubscriptionEntitlement = (
  candidate: BackendEntitlementCandidate | null | undefined,
  nowMs = Date.now(),
): EffectiveSubscriptionEntitlement => {
  if (!candidate || candidate.schemaVersion !== 1) {
    return freeWithReason('missing-or-malformed');
  }

  if (candidate.cryptographicallyVerified !== true) {
    return freeWithReason('unverified');
  }

  if (!isSubscriptionPlanId(candidate.plan)) {
    return freeWithReason('unsupported-plan');
  }

  if (candidate.plan === 'free') {
    return FREE_ENTITLEMENT;
  }

  const lifecycleState = normalizeLifecycleState(candidate.lifecycleState);
  if (lifecycleState !== 'active' && lifecycleState !== 'grace') {
    return freeWithReason('non-entitling-lifecycle', lifecycleState);
  }

  if (
    !isFinitePositiveNumber(candidate.issuedAtMs) ||
    !isFinitePositiveNumber(candidate.validUntilMs) ||
    candidate.validUntilMs <= candidate.issuedAtMs ||
    candidate.issuedAtMs > nowMs + MAX_ENTITLEMENT_CLOCK_SKEW_MS
  ) {
    return freeWithReason('invalid-time-window', lifecycleState);
  }

  if (candidate.validUntilMs <= nowMs) {
    return freeWithReason('expired-cache', lifecycleState);
  }

  if (candidate.validUntilMs - candidate.issuedAtMs > MAX_OFFLINE_ENTITLEMENT_WINDOW_MS) {
    return freeWithReason('offline-window-too-long', lifecycleState);
  }

  return {
    plan: candidate.plan,
    lifecycleState,
    source: 'verified-backend-assertion',
    validUntilMs: candidate.validUntilMs,
    reason: lifecycleState === 'active' ? 'verified-active' : 'verified-grace',
  };
};

const uniqueIds = (ids: readonly string[]): string[] =>
  Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));

/**
 * Computes a downgrade/upgrade capacity transition without deleting configuration.
 *
 * If existing active apps exceed the new plan and no valid explicit user selection
 * exists, this function intentionally refuses to choose winners silently. Callers
 * must keep the previous durable configuration untouched until the user makes a
 * valid selection and the replacement config can be committed atomically.
 */
export const decideProtectedAppCapacity = (
  planId: SubscriptionPlanId,
  configuredAppIds: readonly string[],
  currentlyActiveAppIds: readonly string[],
  explicitSelectedAppIds: readonly string[] | null = null,
): ProtectedAppCapacityDecision => {
  const configured = uniqueIds(configuredAppIds);
  const configuredSet = new Set(configured);
  const active = uniqueIds(currentlyActiveAppIds).filter((id) => configuredSet.has(id));
  const limit = SUBSCRIPTION_PLAN_POLICY[planId].protectedAppLimit;

  if (limit === null) {
    return {
      limit,
      selectedActiveAppIds: active,
      pausedAppIds: configured.filter((id) => !active.includes(id)),
      requiresUserChoice: false,
      reason: 'unlimited',
    };
  }

  if (active.length <= limit && explicitSelectedAppIds === null) {
    return {
      limit,
      selectedActiveAppIds: active,
      pausedAppIds: configured.filter((id) => !active.includes(id)),
      requiresUserChoice: false,
      reason: 'within-limit',
    };
  }

  if (explicitSelectedAppIds !== null) {
    const selected = uniqueIds(explicitSelectedAppIds).filter((id) => configuredSet.has(id));
    if (selected.length <= limit) {
      return {
        limit,
        selectedActiveAppIds: selected,
        pausedAppIds: configured.filter((id) => !selected.includes(id)),
        requiresUserChoice: false,
        reason: 'explicit-selection-applied',
      };
    }
  }

  return {
    limit,
    selectedActiveAppIds: [],
    pausedAppIds: [],
    requiresUserChoice: true,
    reason: 'selection-required',
  };
};
