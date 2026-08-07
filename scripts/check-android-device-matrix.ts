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
  /lastProtectionStartAt:\s*number[\s\S]*lastProtectionStopAt:\s*number[\s\S]*lastProtectionStopCode:\s*string[\s\S]*lastProtectionStopMessage:\s*string/,
  'The TypeScript diagnostic contract must preserve lifecycle fields.',
);
requirePattern(
  debugScreenPath,
  debugScreen,
  /Version[\s\S]*Build[\s\S]*App-Benachrichtigungen[\s\S]*Schutzkanal[\s\S]*Schutz-Benachrichtigung[\s\S]*Letzter Schutzstart[\s\S]*Letzter Stoppcode/,
  'The debug screen must visibly show build, notification, and lifecycle health.',
);
requirePattern(
  debugTestPath,
  debugTest,
  /renders build, notification, and protection lifecycle diagnostics/,
  'A component test must protect the expanded Android diagnostic display.',
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
  'RULE-06',
  'RULE-08',
  'RULE-10',
  'RULE-12',
  'LIFE-04',
  'LIFE-07',
  'LIFE-08',
  'LIFE-09',
  'LIFE-10',
  'LIFE-11',
  'TIME-01',
  'TIME-02',
  'TIME-03',
  'UI-01',
  'UI-03',
  'UI-05',
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
  'lastProtectionStopCode',
  'lastProtectionStopMessage',
  'notification_action_stop',
  'unexpected_service_destroy',
  'requireCountdown',
  'requireReason',
  '160 characters',
  'daily emergency maximum',
  'NEUSTART NÖTIG',
  'INKONSISTENT',
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
  'Android device-matrix check passed. Build identity, channel/lifecycle diagnostics, emergency-friction evidence, stale activation, terminal service reasons, OEM coverage, migration recovery, and evidence requirements are guarded.',
);