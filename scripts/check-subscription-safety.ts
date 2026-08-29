import { readFile } from 'node:fs/promises';

const packagePath = 'package.json';
const androidBuildPath = 'android/app/build.gradle';
const appPath = 'src/App.tsx';
const settingsPath = 'src/screens/SettingsScreen.tsx';
const dashboardPath = 'src/screens/DashboardScreen.tsx';
const onboardingPath = 'src/screens/ReleaseOnboardingScreens.tsx';
const permissionsPath = 'src/screens/ReleasePermissionsScreen.tsx';
const profilesPath = 'src/screens/ProfilesScreen.tsx';
const subscriptionPolicyPath = 'src/lib/subscriptionPlanPolicy.ts';
const subscriptionPolicyTestPath = 'src/lib/subscriptionPlanPolicy.test.ts';
const entitlementPolicyPath = 'src/lib/subscriptionEntitlementPolicy.ts';
const entitlementPolicyTestPath = 'src/lib/subscriptionEntitlementPolicy.test.ts';
const subscriptionGatePath = 'docs/SUBSCRIPTION_RELEASE_GATE.md';
const competitiveStrategyPath = 'docs/COMPETITIVE_PRODUCT_STRATEGY.md';

const [
  packageJson,
  androidBuild,
  app,
  settings,
  dashboard,
  onboarding,
  permissions,
  profiles,
  subscriptionPolicy,
  subscriptionPolicyTest,
  entitlementPolicy,
  entitlementPolicyTest,
  subscriptionGate,
  competitiveStrategy,
] = await Promise.all([
  readFile(packagePath, 'utf8'),
  readFile(androidBuildPath, 'utf8'),
  readFile(appPath, 'utf8'),
  readFile(settingsPath, 'utf8'),
  readFile(dashboardPath, 'utf8'),
  readFile(onboardingPath, 'utf8'),
  readFile(permissionsPath, 'utf8'),
  readFile(profilesPath, 'utf8'),
  readFile(subscriptionPolicyPath, 'utf8'),
  readFile(subscriptionPolicyTestPath, 'utf8'),
  readFile(entitlementPolicyPath, 'utf8'),
  readFile(entitlementPolicyTestPath, 'utf8'),
  readFile(subscriptionGatePath, 'utf8'),
  readFile(competitiveStrategyPath, 'utf8'),
]);

const findings: string[] = [];
const productionSurface = [app, settings, dashboard, onboarding, permissions, profiles].join('\n');
const billingDependencyPresent = /revenuecat|purchases-capacitor|play-billing|billingclient|storekit|com\.android\.billingclient/i.test(
  `${packageJson}\n${androidBuild}`,
);
const subscriptionReleaseBlocked = /Status: \*\*BLOCKED \/ architecture gate only\*\*/.test(subscriptionGate);

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
}

function rejectPattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) findings.push(`${file}: ${message}`);
}

requirePattern(
  settingsPath,
  settings,
  /Abo-Funktionen werden hier bewusst nicht als aktive Einstellungen angeboten/,
  'Settings must explicitly state that unfinished subscription functionality is not active.',
);

requirePattern(
  subscriptionPolicyPath,
  subscriptionPolicy,
  /type SubscriptionPlanId = 'free' \| 'plus' \| 'max'/,
  'Plan policy must expose exactly Free, Plus, and Max.',
);
requirePattern(
  subscriptionPolicyPath,
  subscriptionPolicy,
  /free:[\s\S]*protectedAppLimit: 1[\s\S]*plus:[\s\S]*protectedAppLimit: 3[\s\S]*max:[\s\S]*protectedAppLimit: null/,
  'Protected-app plan limits must remain Free=1, Plus=3, Max=unlimited.',
);
requirePattern(
  subscriptionPolicyPath,
  subscriptionPolicy,
  /resolveVerifiedSubscriptionPlan[\s\S]*if \(!purchaseVerified\) return 'free'[\s\S]*isSubscriptionPlanId\(candidate\) \? candidate : 'free'/,
  'Unverified or malformed paid entitlement must fail closed to Free.',
);
requirePattern(
  subscriptionPolicyPath,
  subscriptionPolicy,
  /ALWAYS_FREE_SAFETY_FEATURES[\s\S]*bounded emergency path[\s\S]*native service-health diagnostics[\s\S]*data export\/import/,
  'Safety, diagnostics, and user-owned data access must remain outside paid capability gates.',
);
requirePattern(
  subscriptionPolicyTestPath,
  subscriptionPolicyTest,
  /three planned protection limits at 1, 3, and unlimited[\s\S]*fails closed to Free when paid entitlement is not verified[\s\S]*reserves advanced automation for higher tiers/,
  'Vitest must lock plan limits, fail-closed entitlement, and safety boundaries.',
);

requirePattern(
  entitlementPolicyPath,
  entitlementPolicy,
  /MAX_OFFLINE_ENTITLEMENT_WINDOW_MS = 72 \* 60 \* 60 \* 1000/,
  'Offline paid entitlement cache must remain bounded to 72 hours unless the release contract is deliberately revised.',
);
requirePattern(
  entitlementPolicyPath,
  entitlementPolicy,
  /cryptographicallyVerified !== true[\s\S]*freeWithReason\('unverified'\)/,
  'Paid entitlement must fail closed without cryptographic backend verification.',
);
requirePattern(
  entitlementPolicyPath,
  entitlementPolicy,
  /lifecycleState !== 'active' && lifecycleState !== 'grace'[\s\S]*non-entitling-lifecycle/,
  'Pending, expired, revoked, and unknown lifecycle states must never grant paid access.',
);
requirePattern(
  entitlementPolicyPath,
  entitlementPolicy,
  /validUntilMs <= nowMs[\s\S]*expired-cache[\s\S]*validUntilMs - candidate\.issuedAtMs > MAX_OFFLINE_ENTITLEMENT_WINDOW_MS[\s\S]*offline-window-too-long/,
  'Expired or overlong offline assertions must fail closed.',
);
requirePattern(
  entitlementPolicyPath,
  entitlementPolicy,
  /requiresUserChoice: true[\s\S]*selectedActiveAppIds: \[\][\s\S]*pausedAppIds: \[\][\s\S]*selection-required/,
  'Over-capacity downgrade must refuse silent app selection and must not mutate configuration implicitly.',
);
requirePattern(
  entitlementPolicyPath,
  entitlementPolicy,
  /keep the previous durable configuration untouched until the user makes a[\s\S]*replacement config can be committed atomically/i,
  'Downgrade policy must preserve the previous durable config until explicit replacement is ready.',
);
requirePattern(
  entitlementPolicyTestPath,
  entitlementPolicyTest,
  /never grants paid access for pending, expired, revoked, or unknown lifecycle states[\s\S]*refuses to silently choose protected apps[\s\S]*applies only an explicit valid downgrade selection/,
  'Vitest must lock lifecycle fail-closed behavior and explicit downgrade selection.',
);

requirePattern(
  subscriptionGatePath,
  subscriptionGate,
  /Status: \*\*BLOCKED \/ architecture gate only\*\*[\s\S]*Google Play Billing[\s\S]*Secure backend entitlement verification[\s\S]*Restore purchases[\s\S]*pending purchase[\s\S]*refund\/revocation/i,
  'Subscription gate must remain blocked until billing, backend verification, restore, and lifecycle evidence exist.',
);
requirePattern(
  subscriptionGatePath,
  subscriptionGate,
  /Do not paywall data rescue, diagnostics, basic safety exits or the ability to export user-owned data/,
  'Subscription policy must protect safety and user-owned data from paywalling.',
);
requirePattern(
  subscriptionGatePath,
  subscriptionGate,
  /PENDING[^\n]*never grants paid access|`PENDING` never grants Plus\/Max/i,
  'Pending purchases must never unlock a paid entitlement.',
);
requirePattern(
  subscriptionGatePath,
  subscriptionGate,
  /secure backend verification with Google Play Developer API[\s\S]*Real-time Developer Notifications|Google Play purchase token[\s\S]*secure backend verification[\s\S]*RTDN/i,
  'Paid entitlement architecture must require server-side verification and subscription lifecycle updates.',
);
requirePattern(
  subscriptionGatePath,
  subscriptionGate,
  /never delete rules\/profiles\/history[\s\S]*do not silently choose different protected apps/i,
  'Downgrade must preserve data and must not silently choose which apps lose protection.',
);
requirePattern(
  competitiveStrategyPath,
  competitiveStrategy,
  /No subscription expiry may delete configurations, history, statistics, exports, migration archives or recovery data/,
  'Downgrade policy must preserve existing user-owned data.',
);
requirePattern(
  competitiveStrategyPath,
  competitiveStrategy,
  /Free → 1 protected app[\s\S]*Plus → up to 3 protected apps[\s\S]*Max\s+→ unlimited supported protected apps/,
  'Competitive strategy must retain the approved three-tier app-capacity model.',
);

const forbiddenBlockedReleaseClaims = [
  /Abo abschließen/i,
  /Jetzt Pro kaufen/i,
  /Jetzt Plus kaufen/i,
  /Jetzt Max kaufen/i,
  /Pro freischalten/i,
  /Plus freischalten/i,
  /Max freischalten/i,
  /Kostenlos testen/i,
  /Gratis testen/i,
  /7 Tage kostenlos/i,
  /14 Tage kostenlos/i,
  /30 Tage kostenlos/i,
  /monatlich\s*[€$]/i,
  /jährlich\s*[€$]/i,
  /Pro aktiv/i,
  /Plus aktiv/i,
  /Max aktiv/i,
  /Premium aktiv/i,
  /Restore purchases/i,
  /Käufe wiederherstellen/i,
];

if (subscriptionReleaseBlocked || !billingDependencyPresent) {
  for (const forbidden of forbiddenBlockedReleaseClaims) {
    rejectPattern(
      'production release surfaces',
      productionSurface,
      forbidden,
      `A purchase/paywall claim is visible while subscription release is still blocked: ${forbidden}.`,
    );
  }
}

if (findings.length > 0) {
  console.log('Subscription safety check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  billingDependencyPresent
    ? 'Subscription safety check passed. Free/Plus/Max and entitlement lifecycle are source-guarded; purchase UI remains blocked until the subscription release gate is explicitly cleared.'
    : 'Subscription safety check passed. Free=1, Plus=3, Max=unlimited, cryptographic entitlement fail-closed behavior, bounded offline access, and non-destructive downgrade selection are source-guarded.',
);
