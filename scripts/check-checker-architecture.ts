import { readFile } from 'node:fs/promises';

const paths = {
  packageJson: 'package.json',
  readiness: 'scripts/readiness-report.ts',
  androidProject: 'scripts/check-android-project.ts',
  prerequisiteStops: 'scripts/check-prerequisite-stop-codes.ts',
  processLoss: 'scripts/check-process-loss-recovery.ts',
  configDurability: 'scripts/check-protection-config-durability.ts',
  nativeDrain: 'scripts/check-native-drain-ack.ts',
  transparency: 'scripts/check-protection-transparency.ts',
  recovery: 'scripts/check-protection-recovery.ts',
  migrationRecovery: 'scripts/check-migration-recovery-ui.ts',
} as const;

type FileKey = keyof typeof paths;

const entries = await Promise.all(
  Object.entries(paths).map(async ([key, file]) => [key, await readFile(file, 'utf8')] as const),
);
const source = Object.fromEntries(entries) as Record<FileKey, string>;
const findings: string[] = [];

function requireText(key: FileKey, text: string, message: string) {
  if (!source[key].includes(text)) findings.push(`${paths[key]}: ${message}`);
}

for (const required of [
  'recordProtectionStartRequested',
  'stopForProtectionPrerequisite',
  'Productive activation must not bypass the atomic start-request transaction.',
  'Legacy text-derived prerequisite shutdown must not return.',
]) {
  requireText(
    'androidProject',
    required,
    `Android project checker is missing current start/prerequisite architecture marker: ${required}`,
  );
}

for (const required of [
  'dispatchControlledStop',
  "'stopSelf()'",
  'centralized atomic stop + controlled dispatch path',
]) {
  requireText(
    'prerequisiteStops',
    required,
    `Prerequisite checker is missing controlled-stop or legacy-rejection marker: ${required}`,
  );
}

for (const required of ['syncCommitted', 'startCommitted', 'start-pending', 'start-interrupted']) {
  requireText(
    'processLoss',
    required,
    `Process-loss checker is missing current committed-generation/health marker: ${required}`,
  );
}

for (const required of [
  'incrementEmergencyCount',
  'recordIntentionalOpen',
  'appendProtectionEvent',
  'temporaryAccessUntil',
  'only after the counter and event are durably persisted',
  'only after history and event evidence are durably persisted',
]) {
  requireText(
    'configDurability',
    required,
    `Config durability checker is missing durable-before-grant marker: ${required}`,
  );
}

for (const required of [
  'markFactoryReset',
  'dispatchControlledStop',
  'mark native data atomically before a serialized controlled service stop',
]) {
  requireText(
    'nativeDrain',
    required,
    `Native drain checker is missing factory-reset/controlled-dispatch marker: ${required}`,
  );
}

for (const required of [
  'rejectProtectionStartPrerequisite',
  'NOTIFICATIONS_MISSING',
  'persist exact stop evidence and serialize Android stop dispatch before rejecting',
]) {
  requireText(
    'transparency',
    required,
    `Transparency checker is missing atomic notification prerequisite marker: ${required}`,
  );
}

for (const required of [
  'start-pending',
  'recoverAfterProcessLoss',
  'NativeProtection\\.getStatus',
  'NativeProtection\\.syncCommitted',
  'NativeProtection\\.startCommitted',
  'single durable app-open config generation',
  'preparedStartTestPath',
]) {
  requireText(
    'recovery',
    required,
    `Protection recovery checker is missing health-aware single-generation app-open recovery marker: ${required}`,
  );
}

for (const required of [
  'if \\(!isLoaded \\|\\| migrationBlocked\\) return;',
  'Normal React state persistence must stay paused while migration is blocked.',
  'must inspect lifecycle status first.',
]) {
  requireText(
    'migrationRecovery',
    required,
    `Migration recovery checker is missing current fail-closed guard marker: ${required}`,
  );
}

requireText(
  'packageJson',
  '"check:checker-drift": "tsx scripts/check-checker-architecture.ts"',
  'package.json must expose check:checker-drift.',
);
requireText(
  'packageJson',
  'npm run check:checker-drift',
  'npm run verify must execute check:checker-drift.',
);
requireText(
  'readiness',
  "args: ['run', 'check:checker-drift'], required: true",
  'readiness must require the checker-drift guard.',
);

if (findings.length > 0) {
  console.log('Checker architecture drift guard failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Checker architecture drift guard passed. Verify contracts remain aligned with generation-bound starts, explicit legacy rejection rules, atomic/controlled stops, durable-before-grant authorization, single-generation health-aware app-open recovery, reset dispatch, and fail-closed migration guards.',
);