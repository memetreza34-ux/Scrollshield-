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

function forbidText(key: FileKey, text: string, message: string) {
  if (source[key].includes(text)) findings.push(`${paths[key]}: ${message}`);
}

requireText(
  'androidProject',
  'recordProtectionStartRequested',
  'Android project checker must guard the atomic generation-bound start request.',
);
requireText(
  'androidProject',
  'stopForProtectionPrerequisite',
  'Android project checker must guard the current prerequisite-stop helper.',
);
forbidText(
  'androidProject',
  'setProtectionEnabled\\(context, true\\)',
  'Android project checker must not require the removed direct enabled=true start write.',
);
forbidText(
  'androidProject',
  'stopForMissingPermission',
  'Android project checker must not require the removed legacy prerequisite helper.',
);

requireText(
  'prerequisiteStops',
  'dispatchControlledStop',
  'Prerequisite checker must require serialized controlled Android stop dispatch.',
);
forbidText(
  'prerequisiteStops',
  'stopSelf\\(\\)',
  'Prerequisite checker must not require the removed direct stopSelf shutdown path.',
);

for (const required of ['syncCommittedConfig', 'expectedConfigGeneration', 'start-pending', 'start-interrupted']) {
  requireText(
    'processLoss',
    required,
    `Process-loss checker is missing the current generation/health contract token ${required}.`,
  );
}
forbidText(
  'processLoss',
  'AndroidProtection\\.startProtectionService\\(\\)',
  'Process-loss checker must not require a generation-less native service start.',
);

for (const required of ['incrementEmergencyCount', 'recordIntentionalOpen', 'appendProtectionEvent', 'temporaryAccessUntil']) {
  requireText(
    'configDurability',
    required,
    `Config durability checker is missing durable authorization token ${required}.`,
  );
}
forbidText(
  'configDurability',
  'temporaryAccessUntil\\.put[\\s\\S]*appendProtectionEvent',
  'Config durability checker must never require granting temporary access before durable event evidence.',
);

requireText(
  'nativeDrain',
  'dispatchControlledStop',
  'Native drain checker must require controlled dispatch after the factory-reset tombstone.',
);
forbidText(
  'nativeDrain',
  'markFactoryReset[\\s\\S]*stopService',
  'Native drain checker must not require a direct stopService path after factory reset.',
);

requireText(
  'transparency',
  'rejectProtectionStartPrerequisite',
  'Transparency checker must guard the shared atomic prerequisite rejection helper.',
);
forbidText(
  'transparency',
  'call\\.reject\\(\\"Notifications are required',
  'Transparency checker must not require a bare notification prerequisite rejection.',
);

for (const required of ['start-pending', 'recoverAfterProcessLoss', 'NativeProtection\\.getStatus', 'NativeProtection\\.sync']) {
  requireText(
    'recovery',
    required,
    `Protection recovery checker is missing health-aware app-open recovery token ${required}.`,
  );
}
forbidText(
  'recovery',
  'status\\.enabled && !status\\.running && installedActiveAppIds\\.length > 0',
  'Protection recovery checker must not collapse all enabled-but-stopped lifecycle states into one recovery state.',
);

requireText(
  'migrationRecovery',
  'if \\(!isLoaded \\|\\| migrationBlocked\\) return;',
  'Migration recovery checker must guard the current fail-closed save condition.',
);
forbidText(
  'migrationRecovery',
  'if \\(isLoaded && !migrationBlocked\\)',
  'Migration recovery checker must not require the removed positive save guard form.',
);

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
  'Checker architecture drift guard passed. Verify contracts remain aligned with generation-bound starts, atomic/controlled stops, durable grants, health-aware recovery, reset dispatch, and fail-closed migration guards.',
);
