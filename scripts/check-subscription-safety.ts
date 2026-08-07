import { readFile } from 'node:fs/promises';

const packagePath = 'package.json';
const appPath = 'src/App.tsx';
const settingsPath = 'src/screens/SettingsScreen.tsx';
const dashboardPath = 'src/screens/DashboardScreen.tsx';
const onboardingPath = 'src/screens/ReleaseOnboardingScreens.tsx';
const permissionsPath = 'src/screens/ReleasePermissionsScreen.tsx';
const profilesPath = 'src/screens/ProfilesScreen.tsx';
const subscriptionGatePath = 'docs/SUBSCRIPTION_RELEASE_GATE.md';
const competitiveStrategyPath = 'docs/COMPETITIVE_PRODUCT_STRATEGY.md';

const [
  packageJson,
  app,
  settings,
  dashboard,
  onboarding,
  permissions,
  profiles,
  subscriptionGate,
  competitiveStrategy,
] = await Promise.all([
  readFile(packagePath, 'utf8'),
  readFile(appPath, 'utf8'),
  readFile(settingsPath, 'utf8'),
  readFile(dashboardPath, 'utf8'),
  readFile(onboardingPath, 'utf8'),
  readFile(permissionsPath, 'utf8'),
  readFile(profilesPath, 'utf8'),
  readFile(subscriptionGatePath, 'utf8'),
  readFile(competitiveStrategyPath, 'utf8'),
]);

const findings: string[] = [];
const productionSurface = [app, settings, dashboard, onboarding, permissions, profiles].join('\n');
const billingDependencyPresent = /revenuecat|purchases-capacitor|play-billing|billingclient|storekit/i.test(packageJson);

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
  subscriptionGatePath,
  subscriptionGate,
  /Status: \*\*BLOCKED \/ architecture gate only\*\*[\s\S]*Google Play Billing[\s\S]*Restore purchases[\s\S]*Pending purchase[\s\S]*Refund\/revocation/,
  'Subscription gate must remain blocked until billing, restore, and lifecycle evidence exist.',
);
requirePattern(
  subscriptionGatePath,
  subscriptionGate,
  /Do not paywall data rescue, diagnostics, basic safety exits or the ability to export user-owned data/,
  'Subscription policy must protect safety and user-owned data from paywalling.',
);
requirePattern(
  competitiveStrategyPath,
  competitiveStrategy,
  /No subscription expiry may delete configurations, history, statistics, exports, migration archives or recovery data/,
  'Downgrade policy must preserve existing user-owned data.',
);

if (!billingDependencyPresent) {
  for (const forbidden of [
    /Abo abschließen/i,
    /Jetzt Pro kaufen/i,
    /Pro freischalten/i,
    /Kostenlos testen/i,
    /Gratis testen/i,
    /7 Tage kostenlos/i,
    /14 Tage kostenlos/i,
    /30 Tage kostenlos/i,
    /monatlich\s*[€$]/i,
    /jährlich\s*[€$]/i,
    /Pro aktiv/i,
    /Premium aktiv/i,
    /Restore purchases/i,
    /Käufe wiederherstellen/i,
  ]) {
    rejectPattern(
      'production release surfaces',
      productionSurface,
      forbidden,
      `A purchase/paywall claim is visible without a billing dependency: ${forbidden}.`,
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
    ? 'Subscription safety check passed. Billing dependencies exist; full billing/restore evidence is still governed by the subscription release gate.'
    : 'Subscription safety check passed. No billing provider is integrated and production surfaces do not pretend that a paid subscription can be purchased.',
);