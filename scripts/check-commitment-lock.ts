import { readFile } from 'node:fs/promises';

const files = {
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
};

const entries = await Promise.all(
  Object.entries(files).map(async ([key, path]) => [key, await readFile(path, 'utf8')] as const),
);
const source = Object.fromEntries(entries) as Record<keyof typeof files, string>;
const findings: string[] = [];

const requirePattern = (key: keyof typeof files, pattern: RegExp, message: string) => {
  if (!pattern.test(source[key])) findings.push(`${files[key]}: ${message}`);
};

const rejectPattern = (key: keyof typeof files, pattern: RegExp, message: string) => {
  if (pattern.test(source[key])) findings.push(`${files[key]}: ${message}`);
};

requirePattern(
  'policy',
  /COMMITMENT_DURATION_MINUTES\s*=\s*\[60,\s*8 \* 60,\s*24 \* 60\]/,
  'Commitment duration must stay bounded to 1, 8, and 24 hours.',
);
requirePattern(
  'policy',
  /scrollshield_commitment_lock_v1[\s\S]*loadCommitmentLock[\s\S]*saveCommitmentLock[\s\S]*clearCommitmentLock/,
  'Commitment must have explicit short-lived local persistence helpers.',
);
requirePattern(
  'policy',
  /assessCommitmentStartReadiness[\s\S]*android_required[\s\S]*active_app_required[\s\S]*native_unavailable[\s\S]*installed_app_required[\s\S]*service_inconsistent[\s\S]*service_not_running/,
  'Commitment readiness must distinguish platform, configuration, installation, and live-service failures.',
);
requirePattern(
  'policy',
  /runtime\.running\s*&&\s*!runtime\.enabled[\s\S]*!runtime\.running\s*\|\|\s*!runtime\.enabled[\s\S]*return \{ ok: true \}/,
  'Commitment must require a live enabled Android service before activation.',
);
requirePattern(
  'policy',
  /applyCommitmentGuard[\s\S]*looksLikeFullStateReplacement[\s\S]*return \{\}/,
  'Central guard must reject full-state replacements atomically while commitment is active.',
);
requirePattern(
  'policy',
  /applyCommitmentGuard[\s\S]*appsConfig[\s\S]*profiles[\s\S]*activeProfileId[\s\S]*activeProtectionLevel/,
  'Central guard must freeze every protection-configuration surface.',
);
requirePattern(
  'policyTest',
  /requires Android, an active installed app, and a live enabled service before commitment[\s\S]*accepts commitment when at least one of multiple active apps remains installed/,
  'Policy tests must cover live readiness failures and partial target availability.',
);
requirePattern(
  'policyTest',
  /expires automatically[\s\S]*persists the short-lived lock locally[\s\S]*freezes protection configuration[\s\S]*full-state replacement atomically[\s\S]*stops guarding configuration after the deadline/,
  'Policy tests must cover expiry, persistence, guarded writes, atomic import rejection, and release after expiry.',
);

requirePattern(
  'app',
  /loadCommitmentLock\(\)[\s\S]*applyCommitmentGuard\(previousState, updates, commitmentLock\)[\s\S]*clearCommitmentLock\(\)/,
  'App.tsx must load, centrally enforce, and clear commitment on full reset.',
);
requirePattern(
  'app',
  /startCommitment\s*=\s*async[\s\S]*NativeProtection\.sync[\s\S]*NativeProtection\.getStatus[\s\S]*assessCommitmentStartReadiness[\s\S]*saveCommitmentLock/,
  'Final commitment confirmation must verify installed targets and live native service status before persistence.',
);
requirePattern(
  'app',
  /runtime_check_failed[\s\S]*Commitment wurde nicht aktiviert[\s\S]*action: 'permissions'/,
  'Native readiness-check failures must fail closed and direct the user to protection status.',
);
requirePattern(
  'app',
  /DashboardScreen[\s\S]*commitmentLock=\{commitmentLock\}/,
  'Dashboard must receive the live commitment state from App.tsx.',
);
requirePattern(
  'app',
  /isCommitmentLockActive\(commitmentLock\)[\s\S]*currentScreen === 'app_detail'[\s\S]*setCurrentScreen\('apps'\)/,
  'App detail must not stay reachable after commitment becomes active.',
);
requirePattern(
  'app',
  /ReleasePrivacyScreen[\s\S]*commitmentLock=\{commitmentLock\}/,
  'Production privacy routing must use the commitment-aware wrapper.',
);
requirePattern(
  'app',
  /\['welcome', 'onboarding', 'permissions', 'help'\]\.includes\(currentScreen\)/,
  'Pre-onboarding help must remain reachable.',
);

requirePattern(
  'dashboard',
  /NativeProtection\.getStatus[\s\S]*5_000[\s\S]*commitmentRuntimeStatus\.running[\s\S]*commitmentRuntimeStatus\.enabled/,
  'Dashboard must periodically verify native service health while commitment is active.',
);
requirePattern(
  'dashboard',
  /Commitment aktiv · Schutzstatus nicht prüfbar[\s\S]*Commitment aktiv · Android-Schutz läuft nicht[\s\S]*lastStopCode/,
  'Dashboard must fail visibly when commitment native health is unknown or unhealthy.',
);
requirePattern(
  'dashboard',
  /Commitment aktiv · Regeln eingefroren[\s\S]*commitmentLock\.lockedUntil[\s\S]*navigate\('rules'\)/,
  'Dashboard must surface a healthy active commitment and link to its details.',
);
requirePattern(
  'dashboardTest',
  /surfaces an active commitment after live native verification and routes to its details[\s\S]*warns and routes to protection status when commitment remains but native protection stops[\s\S]*fails visibly when commitment protection status cannot be read/,
  'Dashboard tests must cover healthy, stopped, and unreadable native commitment states.',
);

requirePattern(
  'profiles',
  /Commitment-Modus[\s\S]*1 Stunde[\s\S]*8 Stunden[\s\S]*24 Stunden[\s\S]*Verbindlich starten/,
  'Profiles must expose deliberate bounded commitment choices with a second confirmation.',
);
requirePattern(
  'profiles',
  /Schutz wird geprüft…[\s\S]*Ziel-App wirklich installiert ist und der Android-Schutzdienst tatsächlich läuft/,
  'Commitment confirmation must visibly disclose and represent the live readiness check.',
);
requirePattern(
  'profiles',
  /nur mit dem nativen Android-Schutz verfügbar[\s\S]*Aktiviere zuerst mindestens eine App[\s\S]*Apps auswählen/,
  'Profiles must block meaningless commitment setup before the final native check.',
);
requirePattern(
  'profiles',
  /Apps prüfen[\s\S]*Schutzstatus öffnen/,
  'Failed readiness checks must expose actionable recovery routes.',
);
requirePattern(
  'profiles',
  /Notfallfreigabe, Hilfe, Datenexport und ein vollständiger App-Reset bleiben verfügbar[\s\S]*Berechtigungen und Schutzstatus können weiterhin repariert werden/,
  'Commitment UI must disclose safety exits and recovery access.',
);
rejectPattern(
  'profiles',
  /Commitment (?:abbrechen|beenden)|Commitment-Modus (?:abbrechen|beenden)/i,
  'An active commitment must not expose a normal cancel action.',
);
requirePattern(
  'profilesTest',
  /second confirmation before starting commitment[\s\S]*does not offer commitment activation in the iOS preview[\s\S]*requires at least one active app[\s\S]*actionable native readiness failure[\s\S]*read-only while commitment is active/,
  'Profiles tests must cover confirmation, preconditions, native readiness failure, and read-only behavior.',
);

requirePattern(
  'appList',
  /configurationLocked[\s\S]*Plan auswählen[\s\S]*Commitment aktiv – Regeln eingefroren/,
  'App list must visibly freeze weekly plans, details, and toggles during commitment.',
);
requirePattern(
  'appListTest',
  /app switches, details, and weekly plans read-only during commitment/,
  'App-list tests must cover all visible commitment restrictions.',
);

requirePattern(
  'privacy',
  /Backup-Import ist während Commitment gesperrt[\s\S]*MutationObserver[\s\S]*onChangeCapture=\{blockImportEvent\}/,
  'Privacy wrapper must keep backup import visibly and behaviorally disabled across rerenders.',
);
requirePattern(
  'privacy',
  /Export, Datenlöschung und ein[\s\S]*kompletter Reset bleiben verfügbar/,
  'Privacy wrapper must preserve export and destructive safety exits.',
);
requirePattern(
  'privacyTest',
  /disables full backup import during commitment[\s\S]*reapplies the import lock[\s\S]*keeps import available when commitment is inactive/,
  'Privacy tests must cover lock, rerender persistence, and normal import availability.',
);

requirePattern(
  'storage',
  /startsWith\(STORAGE_PREFIX\)[\s\S]*localStorage\.removeItem/,
  'Full app reset must still delete every ScrollShield-owned key, including commitment.',
);

requirePattern(
  'contract',
  /native Android[\s\S]*active target app is actually installed[\s\S]*running=true[\s\S]*enabled=true/,
  'Commitment documentation must require real native enforcement before activation.',
);
requirePattern(
  'contract',
  /Recovery while Commitment is active[\s\S]*grant\/re-grant Usage Access[\s\S]*restart the Android protection service/,
  'Commitment documentation must preserve recovery if native protection later stops.',
);
requirePattern(
  'contract',
  /not a tamper-proof parental-control lock[\s\S]*full ScrollShield reset[\s\S]*clearing ScrollShield app data[\s\S]*uninstalling ScrollShield[\s\S]*wall-clock time/,
  'Commitment documentation must disclose the current anti-bypass limits.',
);
requirePattern(
  'contract',
  /export stays available[\s\S]*import is temporarily disabled[\s\S]*rejects full-state replacements atomically/,
  'Commitment documentation must define atomic backup behavior while active.',
);
requirePattern(
  'contract',
  /not part of a normal long-term ScrollShield backup[\s\S]*must not resurrect a historical temporary lock/,
  'Commitment documentation must explain why the ephemeral lock is not restored from normal backups.',
);
requirePattern(
  'contract',
  /purchase, restore, refund\/revocation, offline entitlement, and downgrade behavior/,
  'Commitment must not be positioned as paid until the full billing lifecycle is implemented.',
);

if (findings.length > 0) {
  console.log('Commitment lock check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Commitment lock check passed. The bounded device-local lock requires live enabled Android enforcement before activation, continuously reports later native-service failure honestly, freezes protection configuration centrally and visibly, remains recoverable, rejects full-state imports atomically, expires automatically, preserves safety exits, and is documented as anti-impulse rather than tamper-proof enforcement.',
);
