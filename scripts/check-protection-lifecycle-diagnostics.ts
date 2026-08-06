import { readFile } from 'node:fs/promises';

const javaRoot = 'android/app/src/main/java/app/scrollshield/mobile';
const javaTestRoot = 'android/app/src/test/java/app/scrollshield/mobile';
const pluginPath = `${javaRoot}/ScrollShieldNativePlugin.java`;
const diagnosticsPath = `${javaRoot}/ScrollShieldDiagnosticsPlugin.java`;
const bootReceiverPath = `${javaRoot}/ScrollShieldBootReceiver.java`;
const policyPath = `${javaRoot}/ProtectionStopReasonPolicy.java`;
const policyTestPath = `${javaTestRoot}/ProtectionStopReasonPolicyTest.java`;
const bridgePath = 'src/lib/nativeProtection.ts';
const bridgeTestPath = 'src/lib/nativeProtection.test.ts';
const diagnosticsBridgePath = 'src/lib/nativeDiagnostics.ts';
const appPath = 'src/App.tsx';
const appTestPath = 'src/App.migration.test.tsx';
const debugPath = 'src/screens/DebugScreen.tsx';
const debugTestPath = 'src/screens/DebugScreen.test.tsx';
const matrixPath = 'docs/ANDROID_DEVICE_TEST_MATRIX.md';

const [
  plugin,
  diagnostics,
  bootReceiver,
  policy,
  policyTest,
  bridge,
  bridgeTest,
  diagnosticsBridge,
  app,
  appTest,
  debug,
  debugTest,
  matrix,
] = await Promise.all([
  readFile(pluginPath, 'utf8'),
  readFile(diagnosticsPath, 'utf8'),
  readFile(bootReceiverPath, 'utf8'),
  readFile(policyPath, 'utf8'),
  readFile(policyTestPath, 'utf8'),
  readFile(bridgePath, 'utf8'),
  readFile(bridgeTestPath, 'utf8'),
  readFile(diagnosticsBridgePath, 'utf8'),
  readFile(appPath, 'utf8'),
  readFile(appTestPath, 'utf8'),
  readFile(debugPath, 'utf8'),
  readFile(debugTestPath, 'utf8'),
  readFile(matrixPath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

requirePattern(
  pluginPath,
  plugin,
  /LAST_START_AT_KEY[\s\S]*LAST_STOP_AT_KEY[\s\S]*LAST_STOP_CODE_KEY[\s\S]*LAST_STOP_MESSAGE_KEY/,
  'Native preferences must persist lifecycle timestamps, code, and message.',
);
requirePattern(
  pluginPath,
  plugin,
  /setProtectionEnabled[\s\S]*wasEnabled[\s\S]*protection_disabled[\s\S]*recordProtectionStop/,
  'Native activation changes must preserve a fallback stop reason and allow a specific override.',
);
requirePattern(
  pluginPath,
  plugin,
  /appendProtectionEvent[\s\S]*ProtectionStopReasonPolicy\.classifySystemWarning[\s\S]*LAST_STOP_MESSAGE_KEY/,
  'System warning events must update persistent stop diagnostics.',
);
requirePattern(
  pluginPath,
  plugin,
  /stopProtectionService[\s\S]*reasonCode[\s\S]*reasonMessage[\s\S]*recordProtectionStop/,
  'React must be able to pass an explicit stop reason to Android.',
);
requirePattern(
  pluginPath,
  plugin,
  /start_failed[\s\S]*Android konnte den Schutzdienst nicht starten/,
  'Native start exceptions must retain a stable diagnostic reason.',
);

for (const code of [
  'usage_access_missing',
  'overlay_permission_missing',
  'notifications_missing',
  'no_active_rules',
  'target_app_missing',
  'recovery_start_failed',
  'system_warning',
]) {
  requirePattern(policyPath, policy, new RegExp(`\\b${code}\\b`), `Stop policy is missing code ${code}.`);
  requirePattern(policyTestPath, policyTest, new RegExp(`\\b${code}\\b`), `JUnit coverage is missing code ${code}.`);
}

requirePattern(
  bootReceiverPath,
  bootReceiver,
  /recovery_target_app_missing[\s\S]*recovery_usage_access_missing[\s\S]*recovery_notifications_missing[\s\S]*recovery_overlay_missing[\s\S]*recovery_start_failed/,
  'Boot and app-update recovery must record every prerequisite failure.',
);
requirePattern(
  bootReceiverPath,
  bootReceiver,
  /stopRecovery[\s\S]*setProtectionEnabled\(context, false\)[\s\S]*appendProtectionEvent[\s\S]*recordProtectionStop/,
  'Failed recovery must clear activation, queue a warning, and persist the exact reason.',
);

requirePattern(
  diagnosticsPath,
  diagnostics,
  /lastProtectionStartAt[\s\S]*lastProtectionStopAt[\s\S]*lastProtectionStopCode[\s\S]*lastProtectionStopMessage/,
  'Native diagnostic snapshots must expose lifecycle fields.',
);
requirePattern(
  diagnosticsBridgePath,
  diagnosticsBridge,
  /lastProtectionStartAt:\s*number[\s\S]*lastProtectionStopAt:\s*number[\s\S]*lastProtectionStopCode:\s*string[\s\S]*lastProtectionStopMessage:\s*string/,
  'TypeScript diagnostics must type all lifecycle fields.',
);

requirePattern(
  bridgePath,
  bridge,
  /NativeProtectionStopReason[\s\S]*stopProtectionService\(options:[\s\S]*reasonCode[\s\S]*reasonMessage/,
  'The TypeScript native bridge must pass structured stop reasons.',
);
requirePattern(
  bridgePath,
  bridge,
  /DEFAULT_STOP_REASON[\s\S]*manual_app_stop[\s\S]*async stop\(reason:/,
  'Normal manual stops must retain a stable fallback code and message.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /passes an explicit migration recovery reason to Android[\s\S]*uses a stable manual-stop fallback/,
  'Bridge tests must cover explicit and fallback stop reasons.',
);

requirePattern(
  appPath,
  app,
  /NativeProtection\.stop\(\{[\s\S]*code: 'migration_recovery'[\s\S]*blockierten Datenmigration/,
  'Migration recovery must stop Android with an explicit reason.',
);
requirePattern(
  appTestPath,
  appTest,
  /records the stop reason[\s\S]*code: 'migration_recovery'/,
  'App integration tests must require the migration recovery code.',
);

requirePattern(
  debugPath,
  debug,
  /Letzter Schutzstart[\s\S]*Letzter Stoppzeitpunkt[\s\S]*Letzter Stoppcode[\s\S]*Letzter Stoppgrund/,
  'Debug UI must display lifecycle diagnostics without requiring JSON inspection.',
);
requirePattern(
  debugTestPath,
  debugTest,
  /protection lifecycle diagnostics[\s\S]*notifications_missing[\s\S]*Benachrichtigungen wurden entzogen/,
  'Debug component tests must cover a visible stop reason.',
);

for (const requiredMatrixText of [
  'LIFE-08',
  'lastProtectionStartAt',
  'lastProtectionStopAt',
  'lastProtectionStopCode',
  'lastProtectionStopMessage',
]) {
  requirePattern(
    matrixPath,
    matrix,
    new RegExp(requiredMatrixText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Physical-device matrix is missing lifecycle evidence: ${requiredMatrixText}.`,
  );
}

if (findings.length > 0) {
  console.log('Protection lifecycle diagnostics check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection lifecycle diagnostics check passed. Start/stop timestamps, stable reason codes, recovery failures, explicit migration stops, UI visibility, tests, and device evidence remain guarded.',
);
