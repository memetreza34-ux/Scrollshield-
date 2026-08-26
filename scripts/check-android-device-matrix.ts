import { readFile } from 'node:fs/promises';

const diagnosticsPluginPath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldDiagnosticsPlugin.java';
const diagnosticsBridgePath = 'src/lib/nativeDiagnostics.ts';
const debugScreenPath = 'src/screens/DebugScreen.tsx';
const debugTestPath = 'src/screens/DebugScreen.test.tsx';
const matrixPath = 'docs/ANDROID_DEVICE_TEST_MATRIX.md';

const [diagnosticsPlugin, diagnosticsBridge, debugScreen, debugTest, matrix] = await Promise.all([
  readFile(diagnosticsPluginPath, 'utf8'),
  readFile(diagnosticsBridgePath, 'utf8'),
  readFile(debugScreenPath, 'utf8'),
  readFile(debugTestPath, 'utf8'),
  readFile(matrixPath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

requirePattern(
  diagnosticsPluginPath,
  diagnosticsPlugin,
  /PackageInfo[\s\S]*versionName[\s\S]*getLongVersionCode\(\)/,
  'Native diagnostics must read the installed version name and long version code.',
);
requirePattern(
  diagnosticsPluginPath,
  diagnosticsPlugin,
  /appNotificationsEnabled[\s\S]*protectionChannelCreated[\s\S]*protectionChannelEnabled/,
  'Native diagnostics must separate app-wide notification status from protection-channel health.',
);
requirePattern(
  diagnosticsPluginPath,
  diagnosticsPlugin,
  /protectionConfigGeneration[\s\S]*protectionConfigWriteStateCertain[\s\S]*protectionRuntimeConfigGeneration[\s\S]*startRequestConfigGeneration/,
  'Native diagnostics must expose persisted, certainty, published-runtime, and request config evidence.',
);
requirePattern(
  diagnosticsPluginPath,
  diagnosticsPlugin,
  /lastProtectionStartAt[\s\S]*lastProtectionStopAt[\s\S]*lastProtectionStopCode[\s\S]*lastProtectionStopMessage/,
  'Native diagnostics must expose persistent protection lifecycle evidence.',
);
requirePattern(
  diagnosticsPluginPath,
  diagnosticsPlugin,
  /getNotificationChannel\(PROTECTION_CHANNEL_ID\)[\s\S]*IMPORTANCE_NONE/,
  'Native diagnostics must inspect the exact foreground protection channel.',
);
requirePattern(
  diagnosticsBridgePath,
  diagnosticsBridge,
  /versionName:\s*string[\s\S]*versionCode:\s*number/,
  'The TypeScript diagnostic contract must expose version name and build number.',
);
requirePattern(
  diagnosticsBridgePath,
  diagnosticsBridge,
  /appNotificationsEnabled:\s*boolean[\s\S]*protectionChannelCreated:\s*boolean[\s\S]*protectionChannelEnabled:\s*boolean/,
  'The TypeScript diagnostic contract must preserve separate notification health fields.',
);
requirePattern(
  diagnosticsBridgePath,
  diagnosticsBridge,
  /protectionConfigGeneration:\s*string[\s\S]*protectionConfigWriteStateCertain:\s*boolean[\s\S]*protectionRuntimeConfigGeneration:\s*string[\s\S]*startRequestConfigGeneration:\s*string/,
  'The TypeScript diagnostic contract must preserve config persistence/runtime generations.',
);
requirePattern(
  diagnosticsBridgePath,
  diagnosticsBridge,
  /lastProtectionStartAt:\s*number[\s\S]*lastProtectionStopAt:\s*number[\s\S]*lastProtectionStopCode:\s*string[\s\S]*lastProtectionStopMessage:\s*string/,
  'The TypeScript diagnostic contract must preserve lifecycle fields.',
);
requirePattern(
  debugScreenPath,
  debugScreen,
  /Version[\s\S]*Build[\s\S]*Config-Schreibzustand[\s\S]*Config-Generation[\s\S]*Runtime-Config[\s\S]*Startrequest-Config[\s\S]*Letzter Schutzstart[\s\S]*Letzter Stoppcode/,
  'The debug screen must visibly show build, config persistence/runtime, and lifecycle health.',
);
requirePattern(
  debugTestPath,
  debugTest,
  /protectionRuntimeConfigGeneration[\s\S]*Runtime-Config/,
  'A component test must protect the published runtime config diagnostic display.',
);

for (const requiredDevice of [
  'Google Pixel',
  'Samsung Galaxy',
  'Xiaomi / Redmi',
  'OnePlus',
  'Motorola',
  'Android tablet',
  'Android 7 / API 24',
  'Android 8 / API 26',
  'Android 13 or newer',
]) {
  requirePattern(
    matrixPath,
    matrix,
    new RegExp(requiredDevice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    `Required device coverage is missing: ${requiredDevice}.`,
  );
}

for (const requiredScenario of [
  'INST-02',
  'INST-06',
  'INST-07',
  'INST-08',
  'INST-09',
  'PERM-01',
  'PERM-05',
  'PERM-06',
  'PERM-07',
  'APP-04',
  'APP-05',
  'APP-07',
  'APP-08',
  'APP-09',
  'APP-10',
  'RUNTIME-01',
  'RUNTIME-02',
  'RUNTIME-03',
  'RUNTIME-04',
  'RUNTIME-05',
  'RUNTIME-06',
  'COMMIT-01',
  'COMMIT-02',
  'COMMIT-03',
  'COMMIT-04',
  'COMMIT-05',
  'COMMIT-06',
  'ADAPT-01',
  'ADAPT-02',
  'ADAPT-03',
  'ADAPT-04',
  'ADAPT-05',
  'RULE-06',
  'RULE-08',
  'RULE-10',
  'RULE-11',
  'RULE-12',
  'LIFE-04',
  'LIFE-07',
  'LIFE-08',
  'LIFE-09',
  'LIFE-10',
  'LIFE-11',
  'LIFE-12',
  'LIFE-13',
  'LIFE-14',
  'LIFE-15',
  'TIME-01',
  'TIME-02',
  'TIME-03',
  'UI-01',
  'UI-03',
  'UI-05',
  'UI-06',
]) {
  requirePattern(
    matrixPath,
    matrix,
    new RegExp(`\\b${requiredScenario}\\b`),
    `Mandatory Android test scenario is missing: ${requiredScenario}.`,
  );
}

for (const evidenceField of [
  'ScrollShield version name and version code',
  'Copied Android diagnostic JSON',
  'Screen recording',
  'adb logcat',
  'byte-for-byte',
  'protectionConfigGeneration',
  'protectionConfigWriteStateCertain',
  'protectionRuntimeConfigGeneration',
  'startRequestConfigGeneration',
  'lastProtectionStopCode',
  'lastProtectionStopMessage',
  'notification_action_stop',
  'unexpected_service_destroy',
  'factory_reset',
  'requireCountdown',
  'requireReason',
  '160 characters',
  'daily emergency maximum',
  'maximum font',
  'software keyboard',
  'Zurück zum Startbildschirm',
  'NEUSTART NÖTIG',
  'INKONSISTENT',
  'running=true',
  'enabled=true',
  'Commitment aktiv · Android-Schutz läuft nicht',
  'Stop während Commitment gesperrt',
  'scrollshield_commitment_lock_v1',
  'Full backup import',
  'Adaptive Anti-Binge Friction',
  '5-second escalation',
  '60-second cap',
  'strict Anti-Binge precedence',
  'unchanged emergency timing',
  'local-midnight behavior',
  'Usage boundary across generation switch',
  'Intentional-open evidence survives process loss',
  'Emergency counter survives process loss',
  'persisted usage bucket',
  'process/service termination',
  'PASS',
  'FAIL',
  'BLOCKED',
]) {
  requirePattern(
    matrixPath,
    matrix,
    new RegExp(evidenceField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    `Required test evidence is missing: ${evidenceField}.`,
  );
}

if (findings.length > 0) {
  console.log('Android device-matrix check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Android device-matrix check passed. Build identity, config persistence/runtime generations, RUNTIME-01..06, lifecycle diagnostics, APP-07..10, LIFE-12..15, OEM coverage, migration recovery, accessibility and physical evidence requirements are guarded.',
);
