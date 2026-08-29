export type SubscriptionPlanId = 'free' | 'plus' | 'max';

export type SubscriptionCapability =
  | 'advancedSchedules'
  | 'advancedInsights'
  | 'advancedAntiBinge'
  | 'customEmergencyFriction'
  | 'commitmentMode'
  | 'adaptiveFriction'
  | 'profileAutomation';

export interface SubscriptionPlanPolicy {
  id: SubscriptionPlanId;
  label: string;
  protectedAppLimit: number | null;
  profileLimit: number | null;
  recurringScheduleLimit: number | null;
  insightDays: number;
  capabilities: ReadonlySet<SubscriptionCapability>;
}

const FREE_CAPABILITIES = new Set<SubscriptionCapability>();
const PLUS_CAPABILITIES = new Set<SubscriptionCapability>([
  'advancedSchedules',
  'advancedInsights',
  'advancedAntiBinge',
  'customEmergencyFriction',
]);
const MAX_CAPABILITIES = new Set<SubscriptionCapability>([
  ...PLUS_CAPABILITIES,
  'commitmentMode',
  'adaptiveFriction',
  'profileAutomation',
]);

export const SUBSCRIPTION_PLAN_POLICY: Record<SubscriptionPlanId, SubscriptionPlanPolicy> = {
  free: {
    id: 'free',
    label: 'ScrollShield Free',
    protectedAppLimit: 1,
    profileLimit: 1,
    recurringScheduleLimit: 1,
    insightDays: 7,
    capabilities: FREE_CAPABILITIES,
  },
  plus: {
    id: 'plus',
    label: 'ScrollShield Plus',
    protectedAppLimit: 3,
    profileLimit: 3,
    recurringScheduleLimit: 5,
    insightDays: 30,
    capabilities: PLUS_CAPABILITIES,
  },
  max: {
    id: 'max',
    label: 'ScrollShield Max',
    protectedAppLimit: null,
    profileLimit: null,
    recurringScheduleLimit: null,
    insightDays: 90,
    capabilities: MAX_CAPABILITIES,
  },
};

export const ALWAYS_FREE_SAFETY_FEATURES = [
  'basic whole-app protection',
  'intentional-opening delay',
  'basic session and daily limits',
  'safe return-home action',
  'bounded emergency path',
  'permission transparency',
  'native service-health diagnostics',
  'migration and recovery',
  'data export/import',
  'local reset and uninstall guidance',
] as const;

export const isSubscriptionPlanId = (value: unknown): value is SubscriptionPlanId =>
  value === 'free' || value === 'plus' || value === 'max';

/**
 * This module describes plan capacity only.
 * Effective paid access MUST be resolved through subscriptionEntitlementPolicy.ts;
 * there is deliberately no boolean `purchaseVerified` shortcut here.
 */
export const canProtectAdditionalApp = (
  planId: SubscriptionPlanId,
  currentlyProtectedAppCount: number,
): boolean => {
  const limit = SUBSCRIPTION_PLAN_POLICY[planId].protectedAppLimit;
  if (limit === null) return true;
  return Math.max(0, currentlyProtectedAppCount) < limit;
};

export const hasSubscriptionCapability = (
  planId: SubscriptionPlanId,
  capability: SubscriptionCapability,
): boolean => SUBSCRIPTION_PLAN_POLICY[planId].capabilities.has(capability);
