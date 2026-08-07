import { readFile } from 'node:fs/promises';

const appPath = 'src/App.tsx';
const dashboardPath = 'src/screens/DashboardScreen.tsx';
const dashboardTestPath = 'src/screens/DashboardScreen.test.tsx';
const appDetailPath = 'src/screens/AppDetailScreen.tsx';
const appDetailTestPath = 'src/screens/AppDetailScreen.test.tsx';
const focusPath = 'src/screens/FocusScreen.tsx';
const focusTestPath = 'src/screens/FocusScreen.test.tsx';
const permissionsPath = 'src/screens/ReleasePermissionsScreen.tsx';
const permissionsTestPath = 'src/screens/ReleasePermissionsScreen.test.tsx';
const settingsPath = 'src/screens/SettingsScreen.tsx';
const helpPath = 'src/screens/HelpScreen.tsx';
const historyPath = 'src/screens/HistoryScreen.tsx';
const supportPath = 'src/screens/ReleaseSupportScreen.tsx';
const releaseInfoTestPath = 'src/screens/ReleaseInformationScreens.test.tsx';
const competitiveStrategyPath = 'docs/COMPETITIVE_PRODUCT_STRATEGY.md';

const [
  app,
  dashboard,
  dashboardTest,
  appDetail,
  appDetailTest,
  focus,
  focusTest,
  permissions,
  permissionsTest,
  settings,
  help,
  history,
  support,
  releaseInfoTest,
  competitiveStrategy,
] = await Promise.all([
  readFile(appPath, 'utf8'),
  readFile(dashboardPath, 'utf8'),
  readFile(dashboardTestPath, 'utf8'),
  readFile(appDetailPath, 'utf8'),
  readFile(appDetailTestPath, 'utf8'),
  readFile(focusPath, 'utf8'),
  readFile(focusTestPath, 'utf8'),
  readFile(permissionsPath, 'utf8'),
  readFile(permissionsTestPath, 'utf8'),
  readFile(settingsPath, 'utf8'),
  readFile(helpPath, 'utf8'),
  readFile(historyPath, 'utf8'),
  readFile(supportPath, 'utf8'),
  readFile(releaseInfoTestPath, 'utf8'),
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
  /DashboardScreen[\s\S]*HistoryScreen[\s\S]*AppDetailScreen[\s\S]*SettingsScreen[\s\S]*HelpScreen[\s\S]*ReleaseSupportScreen[\s\S]*FocusScreen[\s\S]*ReleasePermissionsScreen/,
  'The production route must import every release-safe screen.',
);
requirePattern(
  appPath,
  app,
  /currentScreen === 'permissions'[\s\S]*<ReleasePermissionsScreen/,
  'The production permissions route must use ReleasePermissionsScreen.',
);
requirePattern(
  appPath,
  app,
  /\['reels_protection', 'protection_flow', 'active_session'\]\.includes\(currentScreen\)[\s\S]*setCurrentScreen\(appState\.hasCompletedOnboarding \? 'apps' : 'welcome'\)/,
  'Legacy reels, simulation, and web-session routes must redirect away from production surfaces.',
);
requirePattern(
  appPath,
  app,
  /releaseState:[\s\S]*activeSession: null[\s\S]*simulatedAppToOpen: null/,
  'Loaded demo/runtime session state must be cleared before entering the release UI.',
);
for (const forbidden of [
  /ReelsProtectionScreen/,
  /ProtectionFlow/,
  /ActiveSessionScreen/,
  /import \{ PermissionsScreen \} from '\.\/screens\/PermissionsScreen'/,
  /import \{ Focus \} from '\.\/screens\/FocusScreens'/,
  /import \{ History \} from '\.\/screens\/MainScreens'/,
  /import \{[^}]*Settings[^}]*Help[^}]*\} from '\.\/screens\/ConfigScreens'/,
  /import \{ SupportScreen[,}]/,
  /<PermissionsScreen\b/,
  /<AppDetail\b/,
  /<Settings\b/,
  /<Help\b/,
  /<History\b/,
  /<Focus\b/,
]) {
  rejectPattern(appPath, app, forbidden, 'A legacy/demo production route has returned to App.tsx.');
}

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
  focusPath,
  focus,
  /Fokusregeln aktiv[\s\S]*konfigurierte Fokusverhalten[\s\S]*Blockieren[\s\S]*Warnen/,
  'Focus must describe the actual per-app focus behavior instead of universal strict blocking.',
);
requirePattern(
  focusPath,
  focus,
  /Wiederkehrende Fokus-Zeitpläne werden erst angeboten[\s\S]*alten Demo-Zeitpläne sind aus dem Release-Pfad entfernt/,
  'Focus must not expose non-persistent demo schedules.',
);
rejectPattern(
  focusPath,
  focus,
  /setSchedules|Arbeit \/ Deep Work|Digital Detox \/ Schlaf|>Zeitpläne</,
  'The release focus screen must not contain local-only demo schedule state.',
);
requirePattern(
  focusTestPath,
  focusTest,
  /persistent focus timer and no demo schedule tab[\s\S]*starts the actual global focus state[\s\S]*instead of universal strict blocking/,
  'Focus tests must protect persistent state and truthful per-app behavior.',
);

requirePattern(
  permissionsPath,
  permissions,
  /REQUIRED_ANDROID_PERMISSIONS[\s\S]*usageAccess[\s\S]*overlay[\s\S]*notifications/,
  'Release permissions must explicitly define the three required Android protection permissions.',
);
requirePattern(
  permissionsPath,
  permissions,
  /NativeProtection\.sync[\s\S]*installedActiveAppIds[\s\S]*installedActiveAppIds\.length === 0/,
  'Service startup must verify that at least one selected active app is actually available on the device.',
);
requirePattern(
  permissionsPath,
  permissions,
  /Setup später abschließen[\s\S]*behauptet bis dahin nicht, dass der Android-Schutz aktiv ist/,
  'Onboarding must not claim protection readiness while required setup is missing.',
);
requirePattern(
  permissionsPath,
  permissions,
  /iOS-Schutz noch nicht freigegeben[\s\S]*keine künstlichen Berechtigungsschalter/,
  'iOS permissions must remain an honest unreleased state instead of simulated toggles.',
);
rejectPattern(
  permissionsPath,
  permissions,
  /Schutzschirm ist bereit|Fokus-Erinnerungen|Tageszusammenfassungen|Zeitpläne und aktive Sitzungen/,
  'Release permissions must not contain false readiness or unimplemented reminder/schedule claims.',
);
requirePattern(
  permissionsTestPath,
  permissionsTest,
  /never claims onboarding protection is ready[\s\S]*does not expose fake reminder or schedule promises[\s\S]*blocks service start when every selected active app is unavailable[\s\S]*starts only after native permissions and an installed active target are verified/,
  'Release permission tests must guard truthfulness and installed-target startup checks.',
);

requirePattern(
  settingsPath,
  settings,
  /Schutzstatus & Berechtigungen[\s\S]*Geschützte Apps[\s\S]*Profile & Regeln[\s\S]*Statistiken & Verlauf[\s\S]*Datenschutz & lokale Daten/,
  'Settings must route to real protection and local-data functions.',
);
rejectPattern(
  settingsPath,
  settings,
  /Tageszusammenfassung|Wochenrückblick|Rückfall-Warnung|Fokus-Erinnerungen|Abend-Erinnerung/,
  'Unimplemented reminder toggles must not be presented as active release settings.',
);
requirePattern(
  settingsPath,
  settings,
  /Abo-Funktionen werden hier bewusst nicht als aktive Einstellungen angeboten/,
  'Settings must not imply that unfinished subscription functionality is live.',
);

requirePattern(
  helpPath,
  help,
  /gesamte ausgewählte App[\s\S]*Reels-, Shorts-, Feed-Elemente oder Swipe-Bewegungen werden in Version 1 nicht separat erkannt/,
  'Help must explain whole-app-only v1 protection.',
);
requirePattern(
  helpPath,
  help,
  /iOS-Oberfläche ist derzeit nur Produktvorschau[\s\S]*nicht Teil des freigabefähigen Kandidaten/,
  'Help must describe unfinished iOS enforcement honestly.',
);
requirePattern(
  helpPath,
  help,
  /mindestens drei Zeichen[\s\S]*160 Zeichen[\s\S]*lokalen Verlauf/,
  'Help must explain emergency-reason friction and local storage.',
);

requirePattern(
  historyPath,
  history,
  /Gemessene Freigabezeit[\s\S]*Geschätzt gespart[\s\S]*fünf Minuten pro Block-\/Warnintervention als Produktschätzung/,
  'History must distinguish measured usage from estimated saved time.',
);
rejectPattern(
  historyPath,
  history,
  /Heute im Feed|Erlaubte Videos|Kurzvideo-Schutz|Größter Zeitfresser/,
  'History must not surface unsupported or overclaimed short-video analytics.',
);

requirePattern(
  supportPath,
  support,
  /keinen ScrollShield-Account und keinen Cloud-Sync[\s\S]*Lokale Daten verwalten/,
  'Support must direct local usage-data deletion to local controls.',
);
rejectPattern(
  supportPath,
  support,
  /Serverseitige Daten prüfen und löschen lassen|Nutzungsdaten.*Server/,
  'Support must not invent server-side usage data for the local-first release.',
);

requirePattern(
  releaseInfoTestPath,
  releaseInfoTest,
  /settings exposes real destinations without demo reminder toggles[\s\S]*help states whole-app Android scope[\s\S]*history separates measured usage from estimated saved time[\s\S]*support directs local data deletion to local controls/,
  'Release information-screen tests must cover settings, help, history, and support truthfulness.',
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
  'Release surface check passed. Production routing is whole-app-only; demo reels, sessions, schedules and permission claims stay unreachable; Android startup verifies real permissions and installed targets; roadmap claims remain separated from store claims.',
);
