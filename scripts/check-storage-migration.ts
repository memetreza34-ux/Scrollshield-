import { readFile } from 'node:fs/promises';

const storagePath = 'src/lib/storage.ts';
const storageTestPath = 'src/lib/storage.test.ts';
const storageRecoveryTestPath = 'src/lib/storageRecovery.test.ts';
const dataExportPath = 'src/lib/dataExport.ts';
const dataExportTestPath = 'src/lib/dataExport.test.ts';
const migrationDocPath = 'docs/DATA_MIGRATION.md';

const [storage, storageTest, storageRecoveryTest, dataExport, dataExportTest, migrationDoc] = await Promise.all([
  readFile(storagePath, 'utf8'),
  readFile(storageTestPath, 'utf8'),
  readFile(storageRecoveryTestPath, 'utf8'),
  readFile(dataExportPath, 'utf8'),
  readFile(dataExportTestPath, 'utf8'),
  readFile(migrationDocPath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

for (const key of [
  'scrollshield_state_v2',
  'scrollshield_state',
  'scrollshield_brainState',
  'scrollshield_events',
  'scrollshield_rules',
  'scrollshield_game',
  'scrollshield_installed_at',
  'scrollshield_backup_v15',
]) {
  requirePattern(
    storagePath,
    storage,
    new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Legacy storage key is no longer recognized: ${key}.`,
  );
}

requirePattern(
  storagePath,
  storage,
  /PENDING_SUFFIX[\s\S]*recoverPendingTransaction[\s\S]*present !== pending\.length[\s\S]*removePendingEntries/,
  'Interrupted storage transactions must be detected, completed when whole, and discarded when incomplete.',
);
requirePattern(
  storagePath,
  storage,
  /saveStateInternal[\s\S]*Could not stage[\s\S]*Could not commit[\s\S]*return true[\s\S]*return false/,
  'State persistence must verify staged and committed values and return explicit success.',
);
requirePattern(
  storagePath,
  storage,
  /saveState:\s*\(state: AppState\): boolean => \{[\s\S]*if \(hasLegacySource\(\)\)[\s\S]*State save blocked while legacy migration data is unresolved[\s\S]*return false/,
  'Normal application saves must remain blocked while any unresolved legacy source exists.',
);
requirePattern(
  storagePath,
  storage,
  /hasPendingLegacyMigration:\s*\(\): boolean => hasLegacySource\(\)/,
  'The application must be able to identify unresolved legacy migration state.',
);
requirePattern(
  storagePath,
  storage,
  /hasLegacySource[\s\S]*if \(hasLegacySource\(\)\)[\s\S]*return migrateMonolithicState\(\) \?\? migrateV07State\(\)[\s\S]*const orphaned/,
  'A failed legacy migration must return before orphaned current chunks can be normalized over the source data.',
);
requirePattern(
  storagePath,
  storage,
  /archiveRemainingLegacySources[\s\S]*cleanupArchivedLegacySources[\s\S]*return current/,
  'A recovered current state must retry missing archival and only then clean exact legacy duplicates.',
);
requirePattern(
  storagePath,
  storage,
  /cleanupArchivedLegacySources[\s\S]*localStorage\.getItem\(source\.source\) === archivedValue[\s\S]*localStorage\.removeItem\(source\.source\)/,
  'Recovered monolithic sources may only be removed when their live value exactly matches the archived value.',
);
requirePattern(
  storagePath,
  storage,
  /source\.source !== 'legacy_v07_pro'[\s\S]*localStorage\.getItem\(key\) === archivedValue[\s\S]*localStorage\.removeItem\(key\)/,
  'Recovered V0.7 source keys may only be removed after exact archive comparison.',
);
requirePattern(
  storagePath,
  storage,
  /archiveLegacyEntries\(key[\s\S]*saveStateInternal\(normalized, key\)[\s\S]*if \(archived\) localStorage\.removeItem\(key\)/,
  'Monolithic legacy data must only be removed after archival and a verified current-format write.',
);
requirePattern(
  storagePath,
  storage,
  /archiveLegacyEntries\('legacy_v07_pro'[\s\S]*saveStateInternal\(normalized, 'legacy_v07_pro'\)[\s\S]*if \(archived\)[\s\S]*removeItem/,
  'V0.7 source keys must only be removed after lossless archival and a verified current-format write.',
);
requirePattern(
  storagePath,
  storage,
  /Alte Regeln wurden aus Sicherheitsgründen nicht automatisch aktiviert/,
  'Legacy AI rules must remain archived instead of being silently activated in the current protection engine.',
);
requirePattern(
  storagePath,
  storage,
  /metadata:[\s\S]*source: 'legacy_v07'[\s\S]*original: event/,
  'Converted legacy events must retain their original source payload in local history metadata.',
);
requirePattern(
  storagePath,
  storage,
  /getLegacyArchive/,
  'The exact local legacy archive must remain readable for export and diagnosis.',
);

for (const testName of [
  'migrates the unversioned legacy state key instead of silently ignoring it',
  'retains the legacy source when a transactional migration write fails',
  'migrates V0.7 events and saved time while archiving every original key byte-for-byte',
  'finishes a complete pending transaction after an interrupted commit',
  'keeps corrupted legacy data untouched for manual recovery',
]) {
  requirePattern(
    storageTestPath,
    storageTest,
    new RegExp(testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Required migration regression test is missing: ${testName}.`,
  );
}

for (const testName of [
  'does not normalize partially committed chunks after a legacy migration failure',
  'never deletes a legacy source when its value no longer matches the archived copy',
]) {
  requirePattern(
    storageRecoveryTestPath,
    storageRecoveryTest,
    new RegExp(testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Required interrupted-migration recovery test is missing: ${testName}.`,
  );
}
requirePattern(
  storageRecoveryTestPath,
  storageRecoveryTest,
  /StorageService\.saveState\(DEFAULT_STATE\)\)\.toBe\(false\)[\s\S]*scrollshield_meta_v3[\s\S]*toBeNull/,
  'Recovery tests must prove that the normal React save path cannot write default V3 metadata over unresolved legacy data.',
);

requirePattern(
  dataExportPath,
  dataExport,
  /legacyArchive\?: LegacyStorageArchive[\s\S]*readLegacyArchive\(\)/,
  'Normal ScrollShield exports must include the exact V0.7 archive when present.',
);
requirePattern(
  dataExportPath,
  dataExport,
  /isLegacyArchive[\s\S]*restoreLegacyArchive[\s\S]*supported\.legacyArchive/,
  'Current-format imports must validate and restore the optional V0.7 archive.',
);
requirePattern(
  dataExportPath,
  dataExport,
  /isLegacyV07Backup[\s\S]*convertLegacyV07Backup[\s\S]*scrollshield_backup_v15_file/,
  'Former V0.7 backup packages must convert into the supported export contract while preserving the exact input file.',
);
requirePattern(
  dataExportPath,
  dataExport,
  /V0\.7-Backupimport[\s\S]*nicht automatisch aktiviert/,
  'Direct V0.7 backup import must disclose that obsolete AI rules remain inactive.',
);
requirePattern(
  dataExportTestPath,
  dataExportTest,
  /includes the exact V0\.7 archive and restores it during import/,
  'Export tests must cover a complete legacy-archive round trip.',
);
requirePattern(
  dataExportTestPath,
  dataExportTest,
  /imports a former V0\.7 backup file without activating its obsolete AI rules/,
  'Export tests must cover direct conversion of the former V0.7 backup package.',
);
requirePattern(
  dataExportTestPath,
  dataExportTest,
  /rejects malformed former V0\.7 backup files/,
  'Export tests must reject malformed former backup packages before storage changes.',
);
requirePattern(
  dataExportTestPath,
  dataExportTest,
  /rejects a damaged V0\.7 archive without changing local storage/,
  'Export tests must reject damaged legacy archives before storage changes.',
);

for (const requiredSection of [
  'Supported legacy sources',
  'Transactional write protocol',
  'V0.7 conversion rules',
  'Lossless archive',
  'Former backup-file import',
  'Release-candidate validation',
]) {
  requirePattern(
    migrationDocPath,
    migrationDoc,
    new RegExp(requiredSection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    `Migration documentation is missing section: ${requiredSection}.`,
  );
}

if (findings.length > 0) {
  console.log('Storage migration check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Storage migration check passed. Legacy keys, transaction recovery, unresolved-save locking, source retention, partial-write isolation, V0.7 conversion, direct backup import, and archive round trips remain guarded.',
);
