import { readFile } from 'node:fs/promises';

const paths = {
  app: 'src/App.tsx',
  policy: 'src/lib/commitmentLock.ts',
  policyTest: 'src/lib/commitmentLock.test.ts',
  dashboard: 'src/screens/DashboardScreen.tsx',
  dashboardTest: 'src/screens/DashboardScreen.test.tsx',
  appList: 'src/screens/AppListScreen.tsx',
  appListTest: 'src/screens/AppListScreen.test.tsx',
  profiles: 'src/screens/ProfilesScreen.tsx',
  profilesTest: 'src/screens/ProfilesScreen.test.tsx',
  privacy: 'src/screens/ReleasePrivacyScreen.tsx',
  privacyTest: 'src/screens/ReleasePrivacyScreen.test.tsx',
  storage: 'src/lib/storage.ts',
  contract: 'docs/COMMITMENT_MODE.md',
  matrix: 'docs/ANDROID_DEVICE_TEST_MATRIX.md',
} as const;

type FileKey = keyof typeof paths;

const entries = await Promise.all(
  Object.entries(paths).map(async ([key, path]) => [key, await readFile(path, 'utf8')] as const),
);
const files = Object.fromEntries(entries) as Record<FileKey, string>;
const findings: string[] = [];

const mustContain = (key: FileKey, values: string[], message: string) => {
  for (const value of values) {
    if (!files[key].includes(value)) findings.push(`${paths[key]}: ${message} Missing: ${value}`);
  }
};

const mustMatch = (key: FileKey, pattern: RegExp, message: string) => {
  if (!pattern.test(files[key])) findings.push(`${paths[key]}: ${message}`);
};

const mustNotMatch = (key: FileKey, pattern: RegExp, message: string) => {
  if (pattern.test(files[key])) findings.push(`${paths[key]}: ${message}`);
};

mustMatch(
  'policy',
  /COMMITMENT_DURATION_MINUTES\s*=\s*\[60,\s*8 \* 60,\s*24 \* 60\]/,
  'Commitment durations must stay bounded to 1, 8, and 24 hours.',
);
mustContain(
  'policy',
  [
    'scrollshield_commitment_lock_v1',
    'loadCommitmentLock',
    'saveCommitmentLock',
    'clearCommitmentLock',
    'assessCommitmentStartReadiness',
    'android_required',
    'active_app_required',
    'native_unavailable',
    'installed_app_required',
    'service_not_running',
    'service_inconsistent',
    'looksLikeFullStateReplacement',
    'applyCommitmentGuard',
  ],
  'Commitment policy is missing a required activation, persistence, or guard contract.',
);
mustMatch(
  'policy',
  /runtime\.running\s*&&\s*!runtime\.enabled/,
  'A running service without persisted activation must be rejected as inconsistent.',
);
mustMatch(
  'policy',
  /!runtime\.running\s*\|\|\s*!runtime\.enabled/,
  'Commitment must reject a stopped or disabled native service.',
);
mustContain(
  'policyTest',
  [
    'creates only a bounded future lock and expires automatically',
    'persists the short-lived lock locally and removes it after expiry',
    'requires Android, an active installed app, and a live enabled service before commitment',
    'accepts commitment when at least one of multiple active apps remains installed',
    'freezes protection configuration but permits unrelated runtime updates',
    'rejects a full-state replacement atomically instead of partially importing it',
    'stops guarding configuration after the deadline',
  ],
  'Commitment policy tests are incomplete.',
);

mustContain(
  'app',
  [
    'loadCommitmentLock()',
    'applyCommitmentGuard(previousState, updates, commitmentLock)',
    'clearCommitmentLock()',
    'const startCommitment = async',
    'NativeProtection.sync',
    'NativeProtection.getStatus',
    'assessCommitmentStartReadiness',
    'runtime_check_failed',
    'saveCommitmentLock(nextLock)',
    'commitmentLock={commitmentLock}',
  ],
  'App.tsx is missing central commitment activation or enforcement wiring.',
);
mustContain(
  'dashboard',
  [
    'NativeProtection.getStatus()',
    '5_000',
    'commitmentRuntimeStatus.running',
    'commitmentRuntimeStatus.enabled',
    'Commitment aktiv · Schutzstatus nicht prüfbar',
    'Commitment aktiv · Android-Schutz läuft nicht',
    'Commitment aktiv · Regeln eingefroren',
    'lastStopCode',
  ],
  'Dashboard must distinguish healthy, stopped, and unreadable native commitment state.',
);
mustContain(
  'dashboardTest',
  [
    'surfaces an active commitment after live native verification and routes to its details',
    'warns and routes to protection status when commitment remains but native protection stops',
    'fails visibly when commitment protection status cannot be read',
  ],
  'Dashboard commitment runtime tests are incomplete.',
);

mustContain(
  'profiles',
  [
    'Commitment-Modus',
    '1 Stunde',
    '8 Stunden',
    '24 Stunden',
    'Verbindlich starten',
    'Schutz wird geprüft…',
    'Ziel-App wirklich installiert ist und der Android-Schutzdienst tatsächlich läuft',
    'nur mit dem nativen Android-Schutz verfügbar',
    'Aktiviere zuerst mindestens eine App',
    'Apps auswählen',
    'Apps prüfen',
    'Schutzstatus öffnen',
    'Berechtigungen und Schutzstatus können weiterhin repariert werden',
  ],
  'Profiles commitment UI is missing readiness, recovery, or bounded activation behavior.',
);
mustNotMatch(
  'profiles',
  /Commitment (?:abbrechen|beenden)|Commitment-Modus (?:abbrechen|beenden)/i,
  'An active commitment must not expose a normal cancel action.',
);
mustContain(
  'profilesTest',
  [
    'requires an explicit second confirmation before starting commitment',
    'does not offer commitment activation in the iOS preview',
    'requires at least one active app before offering commitment',
    'shows an actionable native readiness failure without activating commitment',
    'makes profile configuration read-only while commitment is active',
  ],
  'Profiles commitment tests are incomplete.',
);

mustContain(
  'appList',
  ['configurationLocked', 'Plan auswählen', 'Commitment aktiv – Regeln eingefroren'],
  'App list must visibly freeze protected-app configuration during commitment.',
);
mustContain(
  'appListTest',
  ['app switches, details, and weekly plans read-only during commitment'],
  'App-list commitment regression coverage is missing.',
);
mustContain(
  'privacy',
  [
    'Backup-Import ist während Commitment gesperrt',
    'MutationObserver',
    'onChangeCapture={blockImportEvent}',
    'Export, Datenlöschung und ein',
    'kompletter Reset bleiben verfügbar',
  ],
  'Privacy wrapper must block full import while preserving data ownership and reset exits.',
);
mustContain(
  'privacyTest',
  [
    'disables full backup import during commitment but preserves export and reset exits',
    'reapplies the import lock after the privacy detail view rerenders its file input',
    'keeps import available when commitment is inactive',
  ],
  'Privacy commitment tests are incomplete.',
);
mustMatch(
  'storage',
  /startsWith\(STORAGE_PREFIX\)[\s\S]*localStorage\.removeItem/,
  'Full app reset must delete every ScrollShield-owned key, including commitment.',
);

mustContain(
  'contract',
  [
    'native Android',
    'active target app is actually installed/available on the device',
    '`running=true`',
    '`enabled=true`',
    'Recovery while Commitment is active',
    'grant/re-grant Usage Access',
    'restart the Android protection service',
    'not tamper-proof',
    'export stays available',
    'import is temporarily disabled',
    'not part of a normal long-term ScrollShield backup',
    'purchase, restore, refund/revocation, offline entitlement, and downgrade behavior',
  ],
  'Commitment documentation is missing activation, recovery, anti-bypass, backup, or subscription constraints.',
);
mustContain(
  'matrix',
  ['COMMIT-01', 'COMMIT-02', 'COMMIT-03', 'COMMIT-04', 'COMMIT-05', 'running=true', 'enabled=true'],
  'Physical-device commitment evidence is not mandatory.',
);

if (findings.length > 0) {
  console.log('Commitment lock check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Commitment lock check passed. Activation requires live native Android enforcement, later service failure is reported honestly, rules remain centrally frozen, recovery and safety exits remain available, full imports are atomic, and physical-device evidence is mandatory.',
);
