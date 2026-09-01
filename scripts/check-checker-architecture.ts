import { readFile } from 'node:fs/promises';

const paths = {
  packageJson: 'package.json',
  readiness: 'scripts/readiness-report.ts',
  androidProject: 'scripts/check-android-project.ts',
  prerequisiteStops: 'scripts/check-prerequisite-stop-codes.ts',
  startHandshake: 'scripts/check-start-handshake.ts',
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
  requireText('androidProject', required, `Android project checker is missing current marker: ${required}`);
}

for (const required of [
  'dispatchControlledStop',
  "'stopSelf()'",
  'centralized atomic stop + controlled dispatch path',
]) {
  requireText('prerequisiteStops', required, `Prerequisite checker is missing current marker: ${required}`);
}

for (const required of [
  'matchesLifecycleSnapshot',
  'requireLifecycleSnapshot',
  'startCommitted',
  'serviceStatus',
  'before',
  'autoRecoverySnapshotMatchesOnlyUnchangedLifecycleTruth',
]) {
  requireText(
    'startHandshake',
    required,
    `Start-handshake checker is missing auto-recovery snapshot marker: ${required}`,
  );
}

for (const required of [
  'syncCommitted',
  'startCommitted',
  'hasNewTerminalEvidenceSince',
  'TARGET_APP_MISSING_STOP_REASON',
  'preserves a newer manual stop that wins while process-loss recovery is in flight',
  'returns fresh native target_app_missing evidence instead of writing a TypeScript stop',
  'rethrows a native start failure when no newer terminal evidence was persisted',
  'start-pending',
  'start-interrupted',
]) {
  requireText(
    'processLoss',
    required,
    `Process-loss checker is missing native-owned snapshot/terminal marker: ${required}`,
  );
}

for (const required of [
  'incrementEmergencyCount',
  'recordIntentionalOpen',
  'appendProtectionEvent',
  'temporaryAccessUntil',
  'Emergency grant may exist only after durable counter and event evidence.',
  'Intentional-open grant may exist only after durable history and event evidence.',
  'startCommitted',
  'syncCommitted',
]) {
  requireText('configDurability', required, `Config durability checker is missing marker: ${required}`);
}

for (const required of [
  'markFactoryReset',
  'dispatchControlledStop',
  'mark native data atomically before a serialized controlled service stop',
]) {
  requireText('nativeDrain', required, `Native drain checker is missing marker: ${required}`);
}

for (const required of [
  'rejectProtectionStartPrerequisite',
  'NOTIFICATIONS_MISSING',
  'persist exact stop evidence and serialize Android stop dispatch before rejecting',
]) {
  requireText('transparency', required, `Transparency checker is missing marker: ${required}`);
}

for (const required of [
  'start-pending',
  'recoverAfterProcessLoss',
  'NativeProtection\\.syncCommitted',
  'NativeProtection\\.startCommitted\\(synced\\.configGeneration, serviceStatus\\)',
  'exact lifecycle snapshot',
  'matchesLifecycleSnapshot',
  'target availability cannot bypass native stale-recovery preflight',
  'unavailable targets do not suppress native stale-recovery preflight',
  'Native automatic restart must check snapshot first, then own config/permission/target fail-closed evidence before request persistence.',
]) {
  requireText(
    'recovery',
    required,
    `Protection recovery checker is missing native-owned stale-recovery marker: ${required}`,
  );
}

for (const required of [
  'if \\(!isLoaded \\|\\| migrationBlocked\\) return;',
  'Normal React state persistence must stay paused while migration is blocked.',
  'inspect lifecycle truth first',
  'NativeProtection\\.syncCommitted\\(',
]) {
  requireText(
    'migrationRecovery',
    required,
    `Migration recovery checker is missing explicit durable-sync marker: ${required}`,
  );
}

requireText(
  'packageJson',
  '"check:checker-drift": "tsx scripts/check-checker-architecture.ts"',
  'package.json must expose check:checker-drift.',
);
requireText('packageJson', 'npm run check:checker-drift', 'npm run verify must execute check:checker-drift.');
requireText(
  'readiness',
  "args: ['run', 'check:checker-drift'], required: true",
  'readiness must require check:checker-drift.',
);

if (findings.length > 0) {
  console.log('Checker architecture drift guard failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Checker architecture drift guard passed. Verify contracts remain aligned with lifecycle-snapshot auto recovery, native-owned config/permission/target fail-closed recovery evidence, committed-generation reuse, atomic/controlled stops, durable-before-grant authorization, reset dispatch, and explicit fail-closed migration sync guards.',
);
