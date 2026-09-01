import { readFile } from 'node:fs/promises';

const paths = {
  app: 'src/App.tsx',
  runtimePlatform: 'src/lib/runtimePlatform.ts',
  runtimePlatformTest: 'src/lib/runtimePlatform.test.ts',
  releaseProfiles: 'src/lib/releaseProfiles.ts',
  releaseProfilesTest: 'src/lib/releaseProfiles.test.ts',
  onboarding: 'src/screens/ReleaseOnboardingScreens.tsx',
  onboardingTest: 'src/screens/ReleaseOnboardingScreens.test.tsx',
  permissions: 'src/screens/ReleasePermissionsScreen.tsx',
  permissionsTest: 'src/screens/ReleasePermissionsScreen.test.tsx',
  appList: 'src/screens/AppListScreen.tsx',
  appListTest: 'src/screens/AppListScreen.test.tsx',
  appDetail: 'src/screens/AppDetailScreen.tsx',
  appDetailTest: 'src/screens/AppDetailScreen.test.tsx',
  releaseAppDetail: 'src/screens/ReleaseAppDetailScreen.tsx',
  releaseAppDetailTest: 'src/screens/ReleaseAppDetailScreen.test.tsx',
  profiles: 'src/screens/ProfilesScreen.tsx',
  profilesTest: 'src/screens/ProfilesScreen.test.tsx',
  dashboard: 'src/screens/DashboardScreen.tsx',
  dashboardTest: 'src/screens/DashboardScreen.test.tsx',
  focus: 'src/screens/FocusScreen.tsx',
  focusTest: 'src/screens/FocusScreen.test.tsx',
  settings: 'src/screens/SettingsScreen.tsx',
  help: 'src/screens/HelpScreen.tsx',
  history: 'src/screens/HistoryScreen.tsx',
  support: 'src/screens/ReleaseSupportScreen.tsx',
  releaseInfoTest: 'src/screens/ReleaseInformationScreens.test.tsx',
  competitiveStrategy: 'docs/COMPETITIVE_PRODUCT_STRATEGY.md',
} as const;

const entries = await Promise.all(
  Object.entries(paths).map(async ([key, path]) => [key, await readFile(path, 'utf8')] as const),
);
const files = Object.fromEntries(entries) as Record<keyof typeof paths, string>;
const findings: string[] = [];

function requirePattern(fileKey: keyof typeof paths, pattern: RegExp, message: string) {
  if (pattern.test(files[fileKey])) return;
  findings.push(`${paths[fileKey]}: ${message}`);
}

function rejectPattern(fileKey: keyof typeof paths, pattern: RegExp, message: string) {
  if (!pattern.test(files[fileKey])) return;
  findings.push(`${paths[fileKey]}: ${message}`);
}

function requireText(fileKey: keyof typeof paths, values: string[], message: string) {
  for (const value of values) {
    if (!files[fileKey].includes(value)) {
      findings.push(`${paths[fileKey]}: ${message} Missing: ${value}`);
    }
  }
}

// Production routing must stay on release-safe surfaces.
requireText(
  'app',
  [
    'ReleaseWelcome',
    'ReleaseOnboarding',
    'ReleasePermissionsScreen',
    'ReleaseAppDetailScreen',
    'ProfilesScreen',
    'DashboardScreen',
    'HistoryScreen',
    'FocusScreen',
    'SettingsScreen',
    'HelpScreen',
    'ReleaseSupportScreen',
    'getRuntimeOperatingSystem',
  ],
  'Production App route is missing a release-safe surface or runtime-platform guard.',
);
requirePattern(
  'app',
  /releaseState:[\s\S]*activeSession: null[\s\S]*simulatedAppToOpen: null/,
  'Loaded demo runtime state must be cleared before entering the release UI.',
);
requirePattern(
  'app',
  /\['reels_protection', 'protection_flow', 'active_session'\]\.includes\(currentScreen\)/,
  'Legacy demo routes must remain redirected away from production surfaces.',
);
for (const forbidden of [
  /from '\.\/screens\/OnboardingScreens'/,
  /from '\.\/screens\/PermissionsScreen'/,
  /from '\.\/screens\/FocusScreens'/,
  /from '\.\/screens\/MainScreens'/,
  /ReelsProtectionScreen/,
  /ProtectionFlow/,
  /ActiveSessionScreen/,
  /import \{[^}]*Rules[^}]*\} from '\.\/screens\/ConfigScreens'/,
]) {
  rejectPattern('app', forbidden, 'A legacy/demo production import has returned.');
}

// Native runtime must override stale demo OS state on installed builds.
requirePattern(
  'runtimePlatform',
  /nativePlatform[\s\S]*runtimePlatform === 'android'[\s\S]*return 'android'[\s\S]*runtimePlatform === 'ios'[\s\S]*return 'ios'/,
  'Native runtime platform must override a stale saved/demo operating system.',
);
requirePattern(
  'runtimePlatformTest',
  /installed Android runtime even when old state says iOS[\s\S]*installed iOS runtime even when old state says Android/,
  'Runtime-platform tests must cover stale opposite-platform state.',
);

// Onboarding/store-facing first-run copy must be whole-app-only and explicit.
requireText(
  'onboarding',
  ['Ganze Apps bewusst öffnen', 'getReleaseProfileConfig', 'updatedAt'],
  'Release onboarding is missing whole-app scope or safe preset application.',
);
requirePattern(
  'onboarding',
  /Version 1 schützt die gesamte ausgewählte App[\s\S]*einzelne\s+Reels,\s+Shorts oder\s+Feed-Bereiche werden nicht separat erkannt/,
  'Release onboarding must disclose whole-app scope and unsupported sub-screen detection.',
);
rejectPattern(
  'onboarding',
  /Kurzvideo-Sog stoppen|Die 2 Schutzebenen|Reels.*automatisch erkannt|Shorts.*automatisch erkannt/i,
  'Release onboarding must not reintroduce a fake short-video protection layer.',
);
requirePattern(
  'onboardingTest',
  /whole-app protection instead of a fake short-video layer[\s\S]*requires an app and applies a release-safe normalized profile/,
  'Onboarding tests must protect whole-app scope and safe preset application.',
);

// Old untouched defaults may be translated; explicit edits must remain preserved.
requireText(
  'releaseProfiles',
  [
    'createReleaseDefaultAppConfig',
    'isLegacyUntouchedDefaultConfig',
    'getReleaseProfileConfig',
    "workRules: 'normal'",
    "nightRules: 'normal'",
    'updatedAt !== undefined',
  ],
  'Release profile helpers are missing neutral defaults or edit-preservation logic.',
);
requirePattern(
  'releaseProfiles',
  /createReleaseDefaultAppConfig[\s\S]*antiBinge:[\s\S]*enabled: false/,
  'A newly activated release app must not silently start Anti-Binge.',
);
requirePattern(
  'releaseProfilesTest',
  /neutral defaults for a newly activated release app[\s\S]*only the untouched legacy default[\s\S]*preserves explicit user-edited weekly rules/,
  'Release-profile tests must distinguish untouched defaults from deliberate edits.',
);

// App list and detail must use the same first-activation contract.
requirePattern(
  'appList',
  /isLegacyUntouchedDefaultConfig\(existing\)[\s\S]*createReleaseDefaultAppConfig\(id, true\)[\s\S]*updatedAt/,
  'App-list first activation must translate only an untouched legacy default and mark the edit.',
);
requirePattern(
  'appList',
  /timeWindows: \{ \.\.\.preset\.windows \}[\s\S]*updatedAt/,
  'Weekly-plan changes must receive an explicit edit marker.',
);
requirePattern(
  'appListTest',
  /neutral release default on first activation[\s\S]*weekly preset[\s\S]*explicit edit/,
  'App-list tests must cover neutral activation and weekly edit markers.',
);
requirePattern(
  'releaseAppDetail',
  /isLegacyUntouchedDefaultConfig[\s\S]*createReleaseDefaultAppConfig/,
  'App-detail release wrapper must normalize untouched legacy defaults before rendering.',
);
requirePattern(
  'releaseAppDetail',
  /updateReleaseState[\s\S]*updatedAt: Date\.now\(\)/,
  'App-detail release wrapper must mark deliberate edits.',
);
requirePattern(
  'releaseAppDetailTest',
  /neutral release config before activation[\s\S]*preserves explicitly edited rules/,
  'App-detail release tests must cover untouched defaults and edit preservation.',
);

// App detail itself must only expose Android-v1 controls.
requirePattern(
  'appDetail',
  /Version 1 schützt die gesamte ausgewählte App/,
  'App detail must disclose whole-app v1 enforcement.',
);
requirePattern(
  'appDetail',
  /Einzelne\s+Reels-,\s+Shorts-\s+oder\s+Feed-Bereiche\s+werden\s+nicht\s+separat\s+erkannt/,
  'App detail must disclose unsupported sub-screen detection.',
);
requireText(
  'appDetail',
  ['Notfall-Countdown verlangen', 'Notfall-Begründung verlangen', 'Anti-Binge aktivieren', 'Fokus-Modus Verhalten'],
  'App detail is missing a supported protection control.',
);
rejectPattern(
  'appDetail',
  /ariaLabel="Reels-Schutz aktivieren"|ariaLabel="Swipe-Unterbrecher aktivieren"|ariaLabel="Einzelinhalt-Erlaubnis"/,
  'Unsupported Reels/swipe/single-content controls must remain absent.',
);
requirePattern(
  'appDetailTest',
  /release-supported whole-app controls[\s\S]*Notfall-Countdown verlangen[\s\S]*Notfall-Begründung verlangen/,
  'App-detail tests must protect supported whole-app controls.',
);

// Profiles must represent full protection state, not a cosmetic/focus-only preset.
requireText(
  'profiles',
  ['Schutzprofile', 'Ein Profil wechselt die gesamte App-Konfiguration', 'getReleaseProfileConfig', 'updatedAt'],
  'Profiles screen must switch complete release-safe protection configurations.',
);
rejectPattern('profiles', /Fokus-Profile|Kurzvideos|Endlos-Feeds/, 'Profiles must not revive legacy product claims.');
requirePattern(
  'profilesTest',
  /protection profiles without legacy focus-only or Reels claims[\s\S]*normalizes unsupported legacy values when switching profiles[\s\S]*custom snapshot/,
  'Profile tests must cover release-safe switching and custom snapshots.',
);

// Real Android permissions and installed-target checks are mandatory before service start.
requirePattern(
  'permissions',
  /REQUIRED_ANDROID_PERMISSIONS[\s\S]*usageAccess[\s\S]*overlay[\s\S]*notifications/,
  'Release permissions must explicitly define the three required Android accesses.',
);
requirePattern(
  'permissions',
  /NativeProtection\.sync[\s\S]*installedActiveAppIds[\s\S]*installedActiveAppIds\.length === 0/,
  'Service startup must confirm at least one installed active target.',
);
requireText(
  'permissions',
  [
    'Setup später abschließen',
    'behauptet bis dahin nicht, dass der Android-Schutz aktiv ist',
    'iOS-Schutz noch nicht freigegeben',
  ],
  'Permission flow must remain truthful when protection is not ready or iOS is unreleased.',
);
rejectPattern(
  'permissions',
  /Schutzschirm ist bereit|Fokus-Erinnerungen|Tageszusammenfassungen|Zeitpläne und aktive Sitzungen/,
  'Permission flow must not contain false readiness or unimplemented reminder/schedule claims.',
);
requirePattern(
  'permissionsTest',
  /never claims onboarding protection is ready[\s\S]*blocks service start when every selected active app is unavailable[\s\S]*installed active target/,
  'Permission tests must guard readiness and installed-target startup checks.',
);

// Remaining production surfaces must stay honest.
rejectPattern(
  'dashboard',
  /getReelsStatsForDate|REELS_PLATFORM_IDS|getActiveReelsCount|Kurzvideo-Schutz|Heute im Feed|Erlaubte Videos/,
  'Dashboard must not derive unsupported short-video metrics.',
);
requireText(
  'dashboard',
  ['Geschützte Apps', 'Interventionen', 'Gemessene Freigabezeit', 'Notfallfreigaben'],
  'Dashboard must expose whole-app native protection metrics.',
);
requirePattern(
  'dashboardTest',
  /whole-app release metrics instead of unsupported reel statistics/,
  'Dashboard tests must guard whole-app release metrics.',
);
requirePattern(
  'focus',
  /Fokusregeln aktiv[\s\S]*konfigurierte Fokusverhalten[\s\S]*Wiederkehrende Fokus-Zeitpläne werden erst angeboten/,
  'Focus must describe real per-app behavior and keep demo schedules unavailable.',
);
rejectPattern(
  'focus',
  /setSchedules|Arbeit \/ Deep Work|Digital Detox \/ Schlaf/,
  'Demo focus schedules must remain absent.',
);
requirePattern(
  'focusTest',
  /persistent focus timer and no demo schedule tab[\s\S]*actual global focus state/,
  'Focus tests must protect the real timer path.',
);
rejectPattern(
  'settings',
  /Tageszusammenfassung|Wochenrückblick|Rückfall-Warnung|Fokus-Erinnerungen|Abend-Erinnerung/,
  'Unimplemented reminder toggles must not appear in release settings.',
);
requireText(
  'settings',
  [
    'Schutzstatus & Berechtigungen',
    'Geschützte Apps',
    'Profile & Regeln',
    'Statistiken & Verlauf',
    'Datenschutz & lokale Daten',
  ],
  'Settings must route only to real release functions.',
);
requirePattern(
  'help',
  /gesamte ausgewählte App[\s\S]*Reels-, Shorts-, Feed-Elemente oder Swipe-Bewegungen werden in Version 1 nicht separat erkannt/,
  'Help must explain whole-app-only scope.',
);
requirePattern(
  'history',
  /Gemessene Freigabezeit[\s\S]*Geschätzt gespart[\s\S]*fünf Minuten pro Block-\/Warnintervention als\s+Produktschätzung/,
  'History must distinguish measured time from estimated saved time.',
);
requirePattern(
  'support',
  /keinen ScrollShield-Account und keinen Cloud-Sync[\s\S]*Lokale Daten verwalten/,
  'Support must direct local usage-data deletion to local controls.',
);
rejectPattern(
  'support',
  /Serverseitige Daten prüfen und löschen lassen|Nutzungsdaten.*Server/,
  'Support must not invent server-side usage data.',
);
requirePattern(
  'releaseInfoTest',
  /settings exposes real destinations without demo reminder toggles[\s\S]*help states whole-app Android scope[\s\S]*history separates measured usage from estimated saved time[\s\S]*support directs local data deletion to local controls/,
  'Release information tests must cover the main truthfulness surfaces.',
);

// Roadmap/subscription planning must never become unverified store copy.
requirePattern(
  'competitiveStrategy',
  /product-planning reference, not store copy[\s\S]*A roadmap feature is never a store-listing feature/,
  'Competitive strategy must remain explicitly separate from store claims.',
);
requirePattern(
  'competitiveStrategy',
  /No subscription expiry may delete configurations, history, statistics, exports, migration archives or recovery data/,
  'Future subscription downgrade must preserve user-owned data.',
);

if (findings.length > 0) {
  console.log('Release surface check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Release surface check passed. Native runtime platform, whole-app onboarding, real Android permissions, neutral first activation, edit-preserving profiles and truthful production surfaces remain guarded.',
);
