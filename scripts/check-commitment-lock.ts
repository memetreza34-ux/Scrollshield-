import { readFile } from 'node:fs/promises';

const paths = {
  app: 'src/App.tsx',
  appIntegrationTest: 'src/App.commitmentActivation.test.tsx',
  policy: 'src/lib/commitmentLock.ts',
  policyTest: 'src/lib/commitmentLock.test.ts',
  dashboard: 'src/screens/DashboardScreen.tsx',
  dashboardTest: 'src/screens/DashboardScreen.test.tsx',
  statusPanel: 'src/components/NativeProtectionStatusPanel.tsx',
  statusPanelTest: 'src/components/NativeProtectionStatusPanel.test.tsx',
  permissions: 'src/screens/ReleasePermissionsScreen.tsx',
  permissionsTest: 'src/screens/ReleasePermissionsScreen.test.tsx',
  appList: 'src/screens/AppListScreen.tsx',
  appListTest: 'src/screens/AppListScreen.test.tsx',
  profiles: 'src/screens/ProfilesScreen.tsx',
  profilesTest: 'src/screens/ProfilesScreen.test.tsx',
  privacy: 'src/screens/ReleasePrivacyScreen.tsx',
  privacyTest: 'src/screens/ReleasePrivacyScreen.test.tsx',
  health: 'src/lib/nativeProtectionHealth.ts',
  healthTest: 'src/lib/nativeProtectionHealth.test.ts',
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
    "code: 'factory_reset'",
    'commitmentLock={commitmentLock}',
  ],
  'App.tsx is missing central commitment activation, reset, or enforcement wiring.',
);
mustContain(
  'appIntegrationTest',
  [
    'persists commitment only after the real App flow verifies installed targets and a healthy native service',
    'fails closed and does not persist commitment when the live native service is stopped',
    'fails closed when the native readiness check itself throws',
    'stops native protection with a deliberate factory-reset reason and clears commitment on full reset',
    'scrollshield_commitment_lock_v1',
    'getStatusMock',
    'syncMock',
    'factory_reset',
  ],
  'App-level commitment integration coverage is missing or incomplete.',
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
  'statusPanel',
  ['stopLocked = false', 'stopActionLocked', 'Stop während Commitment gesperrt'],
  'Native protection status panel must block only the in-app stop while disclosing Android system control.',
);
mustMatch(
  'statusPanel',
  /Android\s+kann den Dienst weiterhin über seine Systemoberflächen beenden/,
  'Status panel must disclose that Android system controls remain outside Commitment.',
);
mustContain(
  'statusPanelTest',
  [
    'blocks the in-app stop action while commitment is active but keeps status visible',
    'still permits restarting a stopped service during commitment recovery',
  ],
  'Status-panel tests must cover stop blocking and restart recovery.',
);
mustContain(
  'permissions',
  [
    'commitmentLock = null',
    'isCommitmentLockActive(commitmentLock)',
    'if (commitmentActive)',
    'Der normale App-Stopp ist während Commitment gesperrt',
    'stopLocked={commitmentActive}',
    'Berechtigungen und ein nötiger Neustart des Schutzdienstes bleiben verfügbar',
  ],
  'Permissions must independently block an in-app stop while keeping recovery controls available.',
);
mustContain(
  'permissionsTest',
  [
    'blocks the normal in-app service stop while commitment is active',
    'keeps service restart available during commitment recovery',
  ],
  'Permissions integration tests must cover commitment stop and restart behavior.',
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
    'nur mit dem nativen Android-Schutz verfügbar',
    'Aktiviere zuerst mindestens eine App',
    'Apps auswählen',
    'Apps prüfen',
    'Schutzstatus öffnen',
  ],
  'Profiles commitment UI is missing readiness, recovery, or bounded activation behavior.',
);
mustMatch(
  'profiles',
  /Ziel-App wirklich installiert\s+ist und der Android-Schutzdienst tatsächlich läuft/,
  'Profiles commitment confirmation must disclose installed-target and live-service readiness.',
);
mustMatch(
  'profiles',
  /Berechtigungen\s+und Schutzstatus können weiterhin repariert werden/,
  'Profiles commitment UI must preserve permission and protection-status recovery.',
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
    'kompletter Reset bleiben verfügbar',
  ],
  'Privacy wrapper must block full import while preserving data ownership and reset exits.',
);
mustMatch(
  'privacy',
  /Export, Datenlöschung und\s+ein kompletter Reset bleiben verfügbar/,
  'Privacy wrapper must preserve export, deletion, and full-reset exits during Commitment.',
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
mustContain('health', ['factory_reset'], 'Factory reset must be classified as a deliberate native protection stop.');
mustContain(
  'healthTest',
  ['treats a complete app factory reset as a deliberate stop'],
  'Factory-reset health presentation needs regression coverage.',
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
    'normal **in-app service stop is also disabled',
    'A stopped service may be **started** again during Commitment',
    '`factory_reset`',
    'Android-system controls remain outside the lock',
    'not tamper-proof',
    'export stays available',
    'import is temporarily disabled',
    'purchase, restore, refund/revocation, offline entitlement, and downgrade behavior',
  ],
  'Commitment documentation is missing activation, stop/recovery, reset, anti-bypass, backup, or subscription constraints.',
);
mustMatch(
  'contract',
  /\*{0,2}not\*{0,2} part of a normal long-term ScrollShield backup/,
  'Commitment documentation must keep the temporary lock out of normal long-term backups.',
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
  'Commitment lock check passed. Activation requires live native Android enforcement, the normal in-app stop is blocked while restart/recovery remains available, factory reset stops native protection explicitly, later service failure is reported honestly, rules remain centrally frozen, full imports are atomic, and physical-device evidence is mandatory.',
);
