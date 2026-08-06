import { readFile } from 'node:fs/promises';

const storagePath = 'src/lib/storage.ts';
const storageTestPath = 'src/lib/storage.test.ts';
const dataExportPath = 'src/lib/dataExport.ts';
const dataExportTestPath = 'src/lib/dataExport.test.ts';
const migrationDocPath = 'docs/DATA_MIGRATION.md';

const [storage, storageTest, dataExport, dataExportTest, migrationDoc] = await Promise.all([
  readFile(storagePath, 'utf8'),
  readFile(storageTestPath, 'utf8'),
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
  'Imports must validate and restore the optional V0.7 archive.',
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
  /rejects a damaged V0\.7 archive without changing local storage/,
  'Export tests must reject damaged legacy archives before storage changes.',
);

for (const requiredSection of [
  'Supported legacy sources',
  'Transactional write protocol',
  'V0.7 conversion rules',
  'Lossless archive',
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
  'Storage migration check passed. Legacy keys, transaction recovery, source retention, V0.7 conversion, and archive round trips remain guarded.',
);
