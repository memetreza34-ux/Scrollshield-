import { readFile } from 'node:fs/promises';

const appPath = 'src/App.tsx';
const dashboardPath = 'src/screens/DashboardScreen.tsx';
const dashboardTestPath = 'src/screens/DashboardScreen.test.tsx';
const appDetailPath = 'src/screens/AppDetailScreen.tsx';
const appDetailTestPath = 'src/screens/AppDetailScreen.test.tsx';
const competitiveStrategyPath = 'docs/COMPETITIVE_PRODUCT_STRATEGY.md';

const [app, dashboard, dashboardTest, appDetail, appDetailTest, competitiveStrategy] = await Promise.all([
  readFile(appPath, 'utf8'),
  readFile(dashboardPath, 'utf8'),
  readFile(dashboardTestPath, 'utf8'),
  readFile(appDetailPath, 'utf8'),
  readFile(appDetailTestPath, 'utf8'),
  readFile(competitiveStrategyPath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

function rejectPattern(file: string, content: string, pattern: RegExp, message: string) {
  if (!pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

requirePattern(
  appPath,
  app,
  /import \{ DashboardScreen \} from '\.\/screens\/DashboardScreen';[\s\S]*import \{ AppDetailScreen \} from '\.\/screens\/AppDetailScreen';/,
  'The production route must use the release-safe DashboardScreen and AppDetailScreen.',
);
requirePattern(
  appPath,
  app,
  /currentScreen === 'reels_protection'[\s\S]*setCurrentScreen\('apps'\)/,
  'Legacy reels_protection navigation must be redirected to the supported app list.',
);
rejectPattern(
  appPath,
  app,
  /ReelsProtectionScreen/,
  'The production App route must not import or render the unsupported ReelsProtectionScreen.',
);
rejectPattern(
  appPath,
  app,
  /<AppDetail\b/,
  'The production App route must not render the legacy demo AppDetail surface.',
);

requirePattern(
  appDetailPath,
  appDetail,
  /Version 1 schützt die gesamte ausgewählte App[\s\S]*Einzelne Reels-, Shorts- oder Feed-Bereiche werden nicht separat erkannt/,
  'The app detail screen must disclose whole-app-only v1 enforcement.',
);
for (const requiredControl of [
  'Notfall-Countdown verlangen',
  'Notfall-Begründung verlangen',
  'Anti-Binge aktivieren',
  'Fokus-Modus Verhalten',
]) {
  requirePattern(
    appDetailPath,
    appDetail,
    new RegExp(requiredControl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Release app detail is missing supported control: ${requiredControl}.`,
  );
}
for (const unsupportedControl of [
  'ariaLabel="Reels-Schutz aktivieren"',
  'ariaLabel="Swipe-Unterbrecher aktivieren"',
  'ariaLabel="Einzelinhalt-Erlaubnis"',
]) {
  rejectPattern(
    appDetailPath,
    appDetail,
    new RegExp(unsupportedControl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Unsupported release control returned: ${unsupportedControl}.`,
  );
}
requirePattern(
  appDetailTestPath,
  appDetailTest,
  /exposes only release-supported whole-app controls[\s\S]*Reels-Schutz aktivieren[\s\S]*Notfall-Countdown verlangen[\s\S]*Notfall-Begründung verlangen/,
  'App-detail tests must guard supported emergency controls and absence of legacy reels controls.',
);

rejectPattern(
  dashboardPath,
  dashboard,
  /getReelsStatsForDate|REELS_PLATFORM_IDS|getActiveReelsCount|Kurzvideo-Schutz|Heute im Feed|Erlaubte Videos/,
  'The production dashboard must not derive or display unsupported short-video metrics.',
);
requirePattern(
  dashboardPath,
  dashboard,
  /Geschützte Apps[\s\S]*Interventionen[\s\S]*Gemessene Freigabezeit[\s\S]*Notfallfreigaben/,
  'The production dashboard must expose whole-app native protection metrics.',
);
requirePattern(
  dashboardPath,
  dashboard,
  /native iOS-Schutz ist noch nicht Bestandteil des Release-Kandidaten/,
  'The production dashboard must not imply that the unfinished iOS native engine is available.',
);
requirePattern(
  dashboardTestPath,
  dashboardTest,
  /whole-app release metrics instead of unsupported reel statistics[\s\S]*Kurzvideo-Schutz[\s\S]*iOS as preview/,
  'Dashboard tests must guard truthful whole-app and iOS-preview messaging.',
);

requirePattern(
  competitiveStrategyPath,
  competitiveStrategy,
  /product-planning reference, not store copy[\s\S]*A roadmap feature is never a store-listing feature/,
  'Competitive strategy must remain explicitly separate from release/store claims.',
);
requirePattern(
  competitiveStrategyPath,
  competitiveStrategy,
  /No subscription expiry may delete configurations, history, statistics, exports, migration archives or recovery data/,
  'Subscription strategy must preserve user-owned data after downgrade.',
);

if (findings.length > 0) {
  console.log('Release surface check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Release surface check passed. Production routing remains whole-app-only, unsupported Reels/Shorts controls stay unreachable, emergency controls remain visible, and roadmap claims stay separated from store claims.',
);
