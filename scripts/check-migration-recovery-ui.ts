import { readFile } from 'node:fs/promises';

const packagePath = 'package.json';
const appPath = 'src/App.tsx';
const appTestPath = 'src/App.migration.test.tsx';
const recoveryPath = 'src/lib/legacyRecovery.ts';
const recoveryTestPath = 'src/lib/legacyRecovery.test.ts';
const screenPath = 'src/screens/MigrationRecoveryScreen.tsx';
const screenTestPath = 'src/screens/MigrationRecoveryScreen.test.tsx';
const migrationDocPath = 'docs/DATA_MIGRATION.md';

const [packageJson, app, appTest, recovery, recoveryTest, screen, screenTest, migrationDoc] = await Promise.all([
  readFile(packagePath, 'utf8'),
  readFile(appPath, 'utf8'),
  readFile(appTestPath, 'utf8'),
  readFile(recoveryPath, 'utf8'),
  readFile(recoveryTestPath, 'utf8'),
  readFile(screenPath, 'utf8'),
  readFile(screenTestPath, 'utf8'),
  readFile(migrationDocPath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

requirePattern(
  packagePath,
  packageJson,
  /"check:migration":\s*"tsx scripts\/check-storage-migration\.ts && tsx scripts\/check-migration-recovery-ui\.ts"/,
  'The migration command must execute both storage and recovery-UI contracts.',
);
requirePattern(
  packagePath,
  packageJson,
  /"verify":[^\n]*npm run check:migration/,
  'The complete migration command must remain part of npm run verify.',
);

requirePattern(
  appPath,
  app,
  /const \[migrationBlocked, setMigrationBlocked\] = useState\(false\)/,
  'App must keep an explicit blocked-migration lifecycle state.',
);
requirePattern(
  appPath,
  app,
  /StorageService\.loadState\(\)[\s\S]*StorageService\.hasPendingLegacyMigration\(\)[\s\S]*setMigrationBlocked\(true\)/,
  'Startup must enter recovery when legacy data remains unresolved.',
);
requirePattern(
  appPath,
  app,
  /if \(!migrationBlocked \|\| !NativeProtection\.isAvailable\(\)\) return;[\s\S]*NativeProtection\.stop\(\)/,
  'Blocked migration must stop any previously running native protection service.',
);
requirePattern(
  appPath,
  app,
  /if \(isLoaded && !migrationBlocked\)[\s\S]*StorageService\.saveState\(appState\)/,
  'Normal React state persistence must stay paused while migration is blocked.',
);
requirePattern(
  appPath,
  app,
  /!isLoaded \|\| migrationBlocked \|\| !NativeProtection\.isAvailable\(\)[\s\S]*NativeProtection\.sync/,
  'Native configuration sync must stay paused while migration is blocked.',
);
requirePattern(
  appPath,
  app,
  /!isLoaded \|\| migrationBlocked \|\| !NativeProtection\.isAvailable\(\)[\s\S]*NativeProtection\.drain/,
  'Native event and usage draining must stay paused while migration is blocked.',
);
requirePattern(
  appPath,
  app,
  /retryLegacyMigration[\s\S]*StorageService\.loadState\(\)[\s\S]*hasPendingLegacyMigration[\s\S]*setMigrationBlocked\(false\)/,
  'Recovery retry may unlock the app only after state loads and no legacy source remains.',
);
requirePattern(
  appPath,
  app,
  /if \(migrationBlocked\)[\s\S]*MigrationRecoveryScreen/,
  'Blocked migration must replace the normal application with the dedicated recovery screen.',
);

requirePattern(
  recoveryPath,
  recovery,
  /Object\.keys\(localStorage\)\.sort\(\)[\s\S]*startsWith\(STORAGE_PREFIX\)[\s\S]*rawEntries\[key\] = value/,
  'Recovery package must copy every ScrollShield-owned value exactly and in stable order.',
);
requirePattern(
  recoveryPath,
  recovery,
  /kind: 'legacy-recovery'[\s\S]*schemaVersion: 1[\s\S]*rawEntries/,
  'Recovery package must have an explicit, versioned non-standard artifact identity.',
);
requirePattern(
  recoveryTestPath,
  recoveryTest,
  /exports every ScrollShield-owned value exactly and excludes unrelated keys/,
  'Recovery utility tests must cover exact inclusion and unrelated-key exclusion.',
);

requirePattern(
  screenPath,
  screen,
  /Alte Daten sind geschützt[\s\S]*nicht zurücksetzen oder deinstallieren/,
  'Recovery screen must state that data remains protected and warn against destructive actions.',
);
requirePattern(
  screenPath,
  screen,
  /Android-Schutz wurde vorsorglich gestoppt[\s\S]*bewusst erneut starten/,
  'Recovery screen must disclose native protection shutdown and deliberate restart after migration.',
);
requirePattern(
  screenPath,
  screen,
  /Migration erneut versuchen[\s\S]*Legacy-Rohdaten sichern/,
  'Recovery screen must offer retry and local raw-data backup actions.',
);
requirePattern(
  screenPath,
  screen,
  /createLegacyRecoveryPackage[\s\S]*Blob[\s\S]*createObjectURL[\s\S]*revokeObjectURL/,
  'Recovery download must generate a local JSON file and release its object URL.',
);
requirePattern(
  screenPath,
  screen,
  /sendet diese Daten nicht an einen Server/,
  'Recovery screen must disclose that the raw backup remains local.',
);
requirePattern(
  screenTestPath,
  screenTest,
  /blocks destructive guidance and explains that original data remains protected/,
  'Recovery screen tests must protect the non-destructive guidance.',
);
requirePattern(
  screenTestPath,
  screenTest,
  /Android-Schutz wurde vorsorglich gestoppt[\s\S]*bewusst erneut starten/,
  'Recovery screen tests must protect the native-stop and restart disclosure.',
);
requirePattern(
  screenTestPath,
  screenTest,
  /downloads every ScrollShield raw value as a local recovery package/,
  'Recovery screen tests must protect the raw-data download action.',
);

requirePattern(
  appTestPath,
  appTest,
  /shows only recovery UI, stops native protection, and pauses save and sync while migration is unresolved/,
  'App integration tests must prove recovery exclusivity and lifecycle pausing.',
);
requirePattern(
  appTestPath,
  appTest,
  /saveStateMock\)\.not\.toHaveBeenCalled[\s\S]*nativeSyncMock\)\.not\.toHaveBeenCalled[\s\S]*nativeDrainMock\)\.not\.toHaveBeenCalled/,
  'App integration test must explicitly prohibit save, sync, and drain during recovery.',
);
requirePattern(
  appTestPath,
  appTest,
  /nativeStopMock\)\.toHaveBeenCalledTimes\(1\)/,
  'App integration test must prove native protection is stopped.',
);
requirePattern(
  appTestPath,
  appTest,
  /unlocks the normal app only after retry returns state and no legacy source remains/,
  'App integration tests must protect successful retry unlock conditions.',
);

requirePattern(
  migrationDocPath,
  migrationDoc,
  /## Blocked migration recovery UI[\s\S]*normal application[\s\S]*native configuration[\s\S]*recovery package/,
  'Migration documentation must define the complete blocked-recovery lifecycle.',
);

if (findings.length > 0) {
  console.log('Migration recovery UI check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Migration recovery UI check passed. Command wiring, app blocking, native stop and restart disclosure, save/sync/drain pause, retry, local raw backup, UI guidance, and integration tests remain guarded.',
);
