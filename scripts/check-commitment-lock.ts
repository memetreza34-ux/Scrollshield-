import { readFile } from 'node:fs/promises';

const files = {
  app: 'src/App.tsx',
  policy: 'src/lib/commitmentLock.ts',
  policyTest: 'src/lib/commitmentLock.test.ts',
  appList: 'src/screens/AppListScreen.tsx',
  appListTest: 'src/screens/AppListScreen.test.tsx',
  profiles: 'src/screens/ProfilesScreen.tsx',
  profilesTest: 'src/screens/ProfilesScreen.test.tsx',
  storage: 'src/lib/storage.ts',
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
  /applyCommitmentGuard[\s\S]*appsConfig[\s\S]*profiles[\s\S]*activeProfileId[\s\S]*activeProtectionLevel/,
  'Central guard must freeze every protection-configuration surface.',
);
requirePattern(
  'policyTest',
  /expires automatically[\s\S]*persists the short-lived lock locally[\s\S]*freezes protection configuration[\s\S]*stops guarding configuration after the deadline/,
  'Policy tests must cover expiry, persistence, guarded writes, and release after expiry.',
);

requirePattern(
  'app',
  /loadCommitmentLock\(\)[\s\S]*applyCommitmentGuard\(previousState, updates, commitmentLock\)[\s\S]*clearCommitmentLock\(\)/,
  'App.tsx must load, centrally enforce, and clear commitment on full reset.',
);
requirePattern(
  'app',
  /isCommitmentLockActive\(commitmentLock\)[\s\S]*currentScreen === 'app_detail'[\s\S]*setCurrentScreen\('apps'\)/,
  'App detail must not stay reachable after commitment becomes active.',
);
requirePattern(
  'app',
  /\['welcome', 'onboarding', 'permissions', 'help'\]\.includes\(currentScreen\)/,
  'Pre-onboarding help must remain reachable.',
);

requirePattern(
  'profiles',
  /Commitment-Modus[\s\S]*1 Stunde[\s\S]*8 Stunden[\s\S]*24 Stunden[\s\S]*Verbindlich starten/,
  'Profiles must expose deliberate bounded commitment choices with a second confirmation.',
);
requirePattern(
  'profiles',
  /Notfallfreigabe, Hilfe, Datenexport und ein vollständiger App-Reset bleiben verfügbar/,
  'Commitment UI must disclose its safety exits.',
);
rejectPattern(
  'profiles',
  /Commitment (?:abbrechen|beenden)|Commitment-Modus (?:abbrechen|beenden)/i,
  'An active commitment must not expose a normal cancel action.',
);
requirePattern(
  'profilesTest',
  /second confirmation before starting commitment[\s\S]*read-only while commitment is active/,
  'Profiles tests must cover confirmation and read-only behavior.',
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
  'storage',
  /startsWith\(STORAGE_PREFIX\)[\s\S]*localStorage\.removeItem/,
  'Full app reset must still delete every ScrollShield-owned key, including commitment.',
);

if (findings.length > 0) {
  console.log('Commitment lock check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Commitment lock check passed. The bounded device-local lock requires deliberate confirmation, freezes protection configuration centrally and visibly, expires automatically, and preserves emergency/help/export/reset safety exits.',
);
