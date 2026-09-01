import { readFile } from 'node:fs/promises';

const diagnosticsPluginPath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldDiagnosticsPlugin.java';
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
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
}

requirePattern(
  diagnosticsPluginPath,
  diagnosticsPlugin,
  /PackageInfo[\s\S]*versionName[\s\S]*getLongVersionCode\(\)/,
  'Native diagnostics must read installed version/build identity.',
);
requirePattern(
  diagnosticsPluginPath,
  diagnosticsPlugin,
  /appNotificationsEnabled[\s\S]*protectionChannelCreated[\s\S]*protectionChannelEnabled/,
  'Native diagnostics must separate app-wide and protection-channel notification health.',
);
requirePattern(
  diagnosticsPluginPath,
  diagnosticsPlugin,
  /protectionConfigGeneration[\s\S]*protectionConfigWriteStateCertain[\s\S]*protectionRuntimeConfigGeneration[\s\S]*startRequestConfigGeneration/,
  'Native diagnostics must expose persisted/certainty/runtime/request config evidence.',
);
requirePattern(
  diagnosticsPluginPath,
  diagnosticsPlugin,
  /lastProtectionStartRequestAt[\s\S]*lastProtectionStartAt[\s\S]*lastProtectionStopAt[\s\S]*lastProtectionStopCode[\s\S]*lastProtectionStopMessage/,
  'Native diagnostics must expose complete lifecycle evidence.',
);
requirePattern(
  diagnosticsBridgePath,
  diagnosticsBridge,
  /versionName:\s*string[\s\S]*versionCode:\s*number[\s\S]*protectionRuntimeConfigGeneration:\s*string[\s\S]*lastProtectionStopMessage:\s*string/,
  'TypeScript diagnostics must preserve build/runtime/lifecycle evidence.',
);
requirePattern(
  debugScreenPath,
  debugScreen,
  /Version[\s\S]*Build[\s\S]*Config-Schreibzustand[\s\S]*Runtime-Config[\s\S]*Letzte Startanforderung[\s\S]*Letzter Schutzstart[\s\S]*Letzter Stoppcode/,
  'Debug screen must visibly expose build, config and lifecycle evidence.',
);
requirePattern(
  debugTestPath,
  debugTest,
  /protectionRuntimeConfigGeneration[\s\S]*Runtime-Config/,
  'Debug component test must cover runtime generation.',
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
  'LIFE-16',
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
  'lastProtectionStartRequestAt',
  'lastProtectionStartAt',
  'lastProtectionStopAt',
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
  'Manual stop wins against in-flight automatic app-open recovery',
  'no new `lastProtectionStartRequestAt`',
  'no `start_failed`',
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
  'Android device-matrix check passed. Build identity, config/runtime evidence, RUNTIME-01..06, APP-07..10, LIFE-12..16 including manual-stop-over-auto-recovery, OEM, migration and accessibility evidence are guarded.',
);
