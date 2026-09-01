import { readFile } from 'node:fs/promises';

const paths = {
  packageJson: 'package.json',
  app: 'src/App.tsx',
  appTest: 'src/App.migration.test.tsx',
  recovery: 'src/lib/legacyRecovery.ts',
  recoveryTest: 'src/lib/legacyRecovery.test.ts',
  screen: 'src/screens/MigrationRecoveryScreen.tsx',
  screenTest: 'src/screens/MigrationRecoveryScreen.test.tsx',
  doc: 'docs/DATA_MIGRATION.md',
} as const;

type Key = keyof typeof paths;
const entries = await Promise.all(
  Object.entries(paths).map(async ([key, file]) => [key, await readFile(file, 'utf8')] as const),
);
const source = Object.fromEntries(entries) as Record<Key, string>;
const findings: string[] = [];
function requirePattern(key: Key, pattern: RegExp, message: string) {
  if (!pattern.test(source[key])) findings.push(`${paths[key]}: ${message}`);
}

requirePattern(
  'packageJson',
  /"check:migration":\s*"tsx scripts\/check-storage-migration\.ts && tsx scripts\/check-migration-recovery-ui\.ts"/,
  'Migration command must execute storage and recovery-UI contracts.',
);
requirePattern(
  'packageJson',
  /"verify":[^\n]*npm run check:migration/,
  'Migration command must remain in npm run verify.',
);

requirePattern(
  'app',
  /const \[migrationBlocked, setMigrationBlocked\] = useState\(false\)/,
  'App must keep explicit blocked-migration state.',
);
requirePattern(
  'app',
  /StorageService\.loadState\(\)[\s\S]*StorageService\.hasPendingLegacyMigration\(\)[\s\S]*setMigrationBlocked\(true\)/,
  'Startup must enter recovery while legacy migration remains unresolved.',
);
requirePattern(
  'app',
  /if \(!migrationBlocked \|\| !NativeProtection\.isAvailable\(\)\) return;[\s\S]*NativeProtection\.stop\(\{[\s\S]*code: 'migration_recovery'/,
  'Blocked migration must stop native protection with explicit migration_recovery evidence.',
);
requirePattern(
  'app',
  /if \(!isLoaded \|\| migrationBlocked\) return;[\s\S]*StorageService\.saveState\(appState\)/,
  'Normal React state persistence must stay paused while migration is blocked.',
);
requirePattern(
  'app',
  /!isLoaded \|\|[\s\S]*migrationBlocked \|\|[\s\S]*!appState\.hasCompletedOnboarding \|\|[\s\S]*!NativeProtection\.isAvailable\(\)[\s\S]*NativeProtection\.getStatus\(\)[\s\S]*NativeProtection\.syncCommitted\(/,
  'Native config/recovery effect must remain blocked by migration, inspect lifecycle truth first, and use explicit durable config sync.',
);
requirePattern(
  'app',
  /!isLoaded \|\|[\s\S]*migrationBlocked \|\|[\s\S]*!appState\.hasCompletedOnboarding \|\|[\s\S]*!NativeProtection\.isAvailable\(\)[\s\S]*NativeProtection\.drain/,
  'Native event/usage drain must stay paused while migration is blocked.',
);
requirePattern(
  'app',
  /retryLegacyMigration[\s\S]*StorageService\.loadState\(\)[\s\S]*hasPendingLegacyMigration[\s\S]*setMigrationBlocked\(false\)/,
  'Migration retry may unlock app only after successful load with no pending legacy source.',
);
requirePattern(
  'app',
  /if \(migrationBlocked\)[\s\S]*MigrationRecoveryScreen/,
  'Blocked migration must replace normal app UI with recovery screen.',
);

requirePattern(
  'recovery',
  /Object\.keys\(localStorage\)\.sort\(\)[\s\S]*startsWith\(STORAGE_PREFIX\)[\s\S]*rawEntries\[key\] = value/,
  'Recovery package must copy every ScrollShield-owned raw value in stable order.',
);
requirePattern(
  'recovery',
  /kind: 'legacy-recovery'[\s\S]*schemaVersion: 1[\s\S]*rawEntries/,
  'Recovery package must keep explicit versioned identity.',
);
requirePattern(
  'recoveryTest',
  /exports every ScrollShield-owned value exactly and excludes unrelated keys/,
  'Recovery utility test must protect exact raw-value export.',
);

requirePattern(
  'screen',
  /Alte Daten sind geschützt[\s\S]*nicht zurücksetzen oder deinstallieren[\s\S]*Android-Schutz wurde vorsorglich gestoppt/,
  'Recovery screen must keep non-destructive guidance and native-stop disclosure.',
);
requirePattern(
  'screen',
  /Migration erneut versuchen[\s\S]*Legacy-Rohdaten sichern/,
  'Recovery screen must offer retry and local raw-data backup.',
);
requirePattern(
  'screen',
  /createLegacyRecoveryPackage[\s\S]*Blob[\s\S]*createObjectURL[\s\S]*revokeObjectURL/,
  'Recovery download must remain local and release its object URL.',
);
requirePattern(
  'screenTest',
  /downloads every ScrollShield raw value as a local recovery package/,
  'Recovery screen test must cover local raw backup.',
);
requirePattern('appTest', /migration/i, 'App migration regression tests must remain present.');
requirePattern('doc', /migration/i, 'Migration documentation must remain present.');

if (findings.length > 0) {
  console.log('Migration recovery UI check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Migration recovery UI check passed. Blocked migration pauses saves, durable native sync/recovery and drain; raw recovery remains local and non-destructive.',
);
