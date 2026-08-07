import { readFile } from 'node:fs/promises';

const javaRoot = 'android/app/src/main/java/app/scrollshield/mobile';
const javaTestRoot = 'android/app/src/test/java/app/scrollshield/mobile';
const packagePath = 'package.json';
const readinessPath = 'scripts/readiness-report.ts';
const pluginPath = `${javaRoot}/ScrollShieldNativePlugin.java`;
const servicePath = `${javaRoot}/ScrollShieldProtectionService.java`;
const diagnosticsPath = `${javaRoot}/ScrollShieldDiagnosticsPlugin.java`;
const bootReceiverPath = `${javaRoot}/ScrollShieldBootReceiver.java`;
const policyPath = `${javaRoot}/ProtectionStopReasonPolicy.java`;
const policyTestPath = `${javaTestRoot}/ProtectionStopReasonPolicyTest.java`;
const serviceLifecyclePolicyPath = `${javaRoot}/ProtectionServiceLifecyclePolicy.java`;
const serviceLifecyclePolicyTestPath = `${javaTestRoot}/ProtectionServiceLifecyclePolicyTest.java`;
const bridgePath = 'src/lib/nativeProtection.ts';
const bridgeTestPath = 'src/lib/nativeProtection.test.ts';
const healthPath = 'src/lib/nativeProtectionHealth.ts';
const healthTestPath = 'src/lib/nativeProtectionHealth.test.ts';
const diagnosticsBridgePath = 'src/lib/nativeDiagnostics.ts';
const appPath = 'src/App.tsx';
const appTestPath = 'src/App.migration.test.tsx';
const debugPath = 'src/screens/DebugScreen.tsx';
const debugTestPath = 'src/screens/DebugScreen.test.tsx';
const permissionsPath = 'src/screens/PermissionsScreen.tsx';
const permissionsTestPath = 'src/screens/PermissionsScreen.test.tsx';
const statusPanelPath = 'src/components/NativeProtectionStatusPanel.tsx';
const statusPanelTestPath = 'src/components/NativeProtectionStatusPanel.test.tsx';
const matrixPath = 'docs/ANDROID_DEVICE_TEST_MATRIX.md';

const [
  packageJson,
  readiness,
  plugin,
  service,
  diagnostics,
  bootReceiver,
  policy,
  policyTest,
  serviceLifecyclePolicy,
  serviceLifecyclePolicyTest,
  bridge,
  bridgeTest,
  health,
  healthTest,
  diagnosticsBridge,
  app,
  appTest,
  debug,
  debugTest,
  permissions,
  permissionsTest,
  statusPanel,
  statusPanelTest,
  matrix,
] = await Promise.all([
  readFile(packagePath, 'utf8'),
  readFile(readinessPath, 'utf8'),
  readFile(pluginPath, 'utf8'),
  readFile(servicePath, 'utf8'),
  readFile(diagnosticsPath, 'utf8'),
  readFile(bootReceiverPath, 'utf8'),
  readFile(policyPath, 'utf8'),
  readFile(policyTestPath, 'utf8'),
  readFile(serviceLifecyclePolicyPath, 'utf8'),
  readFile(serviceLifecyclePolicyTestPath, 'utf8'),
  readFile(bridgePath, 'utf8'),
  readFile(bridgeTestPath, 'utf8'),
  readFile(healthPath, 'utf8'),
  readFile(healthTestPath, 'utf8'),
  readFile(diagnosticsBridgePath, 'utf8'),
  readFile(appPath, 'utf8'),
  readFile(appTestPath, 'utf8'),
  readFile(debugPath, 'utf8'),
  readFile(debugTestPath, 'utf8'),
  readFile(permissionsPath, 'utf8'),
  readFile(permissionsTestPath, 'utf8'),
  readFile(statusPanelPath, 'utf8'),
  readFile(statusPanelTestPath, 'utf8'),
  readFile(matrixPath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

requirePattern(
  packagePath,
  packageJson,
  /"check:lifecycle":\s*"tsx scripts\/check-protection-lifecycle-diagnostics\.ts"/,
  'package.json must expose the lifecycle diagnostics check.',
);
requirePattern(
  packagePath,
  packageJson,
  /"verify":[^\n]*npm run check:lifecycle/,
  'The lifecycle diagnostics check must remain part of npm run verify.',
);
requirePattern(
  readinessPath,
  readiness,
  /args: \['run', 'check:lifecycle'\], required: true/,
  'The readiness report must execute lifecycle diagnostics as a required source check.',
);

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

for (const code of ['notification_action_stop', 'unexpected_service_destroy']) {
  requirePattern(
    serviceLifecyclePolicyPath,
    serviceLifecyclePolicy,
    new RegExp(`\\b${code}\\b`),
    `Service lifecycle policy is missing terminal code ${code}.`,
  );
  requirePattern(
    serviceLifecyclePolicyTestPath,
    serviceLifecyclePolicyTest,
    new RegExp(`\\b${code}\\b`),
    `Service lifecycle JUnit coverage is missing terminal code ${code}.`,
  );
}
requirePattern(
  serviceLifecyclePolicyPath,
  serviceLifecyclePolicy,
  /shouldRecordUnexpectedDestroy[\s\S]*protectionEnabled && !explicitStopRequested/,
  'Unexpected destroy classification must require enabled protection without an explicit stop request.',
);
requirePattern(
  serviceLifecyclePolicyTestPath,
  serviceLifecyclePolicyTest,
  /shouldRecordUnexpectedDestroy\(true, false\)[\s\S]*shouldRecordUnexpectedDestroy\(false, false\)[\s\S]*shouldRecordUnexpectedDestroy\(true, true\)/,
  'Service lifecycle JUnit tests must cover unexpected and controlled destroy boundaries.',
);
requirePattern(
  servicePath,
  service,
  /ACTION_STOP[\s\S]*explicitStopRequested = true[\s\S]*NOTIFICATION_ACTION_STOP_CODE[\s\S]*recordProtectionStop[\s\S]*stopSelf\(\)/,
  'The persistent notification stop action must record notification_action_stop before stopping the service.',
);
requirePattern(
  servicePath,
  service,
  /onDestroy\(\)[\s\S]*shouldRecordUnexpectedDestroy[\s\S]*isProtectionEnabled\(this\)[\s\S]*explicitStopRequested[\s\S]*UNEXPECTED_SERVICE_DESTROY_CODE[\s\S]*recordProtectionStop/,
  'Unexpected service destruction must clear stale activation and retain an exact terminal stop reason.',
);
requirePattern(
  servicePath,
  service,
  /stopForMissingPermission[\s\S]*explicitStopRequested = true[\s\S]*setProtectionEnabled\(this, false\)[\s\S]*appendProtectionEvent/,
  'Controlled permission and configuration shutdowns must not be overwritten as unexpected destruction.',
);

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
  bridgePath,
  bridge,
  /NativeProtectionHealth[\s\S]*running-without-activation[\s\S]*stale-activation[\s\S]*stopped-with-reason[\s\S]*never-started/,
  'The bridge must model active, stopped, and inconsistent native states explicitly.',
);
requirePattern(
  bridgePath,
  bridge,
  /getStatus\(\)[\s\S]*lastStartAt: normalizeTimestamp\(result\.lastStartAt\)[\s\S]*lastStopAt: normalizeTimestamp\(result\.lastStopAt\)[\s\S]*lastStopCode: normalizeDiagnosticText\(result\.lastStopCode\)[\s\S]*lastStopMessage: normalizeDiagnosticText\(result\.lastStopMessage\)[\s\S]*assessNativeProtectionHealth/,
  'NativeProtection.getStatus must preserve and normalize every lifecycle field instead of discarding it.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /preserves lifecycle diagnostics and detects stale activation[\s\S]*normalizes malformed lifecycle values[\s\S]*distinguishes active, inconsistent, and stopped states deterministically/,
  'Bridge tests must cover lifecycle preservation, normalization, and deterministic health classification.',
);

requirePattern(
  healthPath,
  health,
  /NEUSTART NÖTIG[\s\S]*Schutz ist gespeichert, aber der Dienst läuft nicht[\s\S]*lastStopMessage/,
  'Health presentation must explain stale activation with the exact native stop message.',
);
requirePattern(
  healthPath,
  health,
  /USER_STOP_CODES[\s\S]*manual_app_stop[\s\S]*notification_action_stop[\s\S]*migration_recovery/,
  'Deliberate user and recovery stops must remain distinguishable from permission or system failures.',
);
requirePattern(
  healthTestPath,
  healthTest,
  /explicit warning for stale native activation[\s\S]*deliberate user stops neutral[\s\S]*permission and system stops as requiring attention/,
  'Health presentation tests must cover stale, deliberate, and system stop states.',
);

requirePattern(
  permissionsPath,
  permissions,
  /serviceStatus[\s\S]*NativeProtection\.getStatus\(\)[\s\S]*setServiceStatus/,
  'The permissions screen must retain the complete native service status.',
);
requirePattern(
  permissionsPath,
  permissions,
  /NativeProtectionStatusPanel[\s\S]*status=\{serviceStatus\}/,
  'The permissions screen must render the dedicated lifecycle health panel.',
);
requirePattern(
  permissionsPath,
  permissions,
  /await NativeProtection\.start[\s\S]*await NativeProtection\.getStatus\(\)[\s\S]*Dienst läuft aber noch nicht/,
  'After a start request, the UI must re-read the actual native state instead of claiming success optimistically.',
);
requirePattern(
  permissionsTestPath,
  permissionsTest,
  /shows stale activation, exact stop code, and stop message from Android[\s\S]*notifications_missing[\s\S]*NEUSTART NÖTIG/,
  'Permissions integration tests must protect visible stale-activation diagnostics.',
);

requirePattern(
  statusPanelPath,
  statusPanel,
  /describeNativeProtectionHealth[\s\S]*Stoppcode[\s\S]*lastStopCode[\s\S]*Schutzdienst starten/,
  'The status panel must show health messaging, exact stop code, and a recovery action.',
);
requirePattern(
  statusPanelTestPath,
  statusPanelTest,
  /stale activation with exact stop diagnostics[\s\S]*notifications_missing[\s\S]*active state and a stop action/,
  'Status-panel tests must cover warning and active states.',
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
  'LIFE-09',
  'LIFE-10',
  'notification_action_stop',
  'unexpected_service_destroy',
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
  'Protection lifecycle diagnostics check passed. Native fields remain preserved, terminal notification/unexpected stops are classified, inconsistent service states are visible, and verification/device evidence remains guarded.',
);