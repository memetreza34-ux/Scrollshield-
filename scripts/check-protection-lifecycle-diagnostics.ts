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
const startHandshakePolicyPath = `${javaRoot}/ProtectionStartHandshakePolicy.java`;
const startHandshakePolicyTestPath = `${javaTestRoot}/ProtectionStartHandshakePolicyTest.java`;
const emergencyPolicyPath = `${javaRoot}/EmergencyUnlockPolicy.java`;
const emergencyPolicyTestPath = `${javaTestRoot}/EmergencyUnlockPolicyTest.java`;
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
  startHandshakePolicy,
  startHandshakePolicyTest,
  emergencyPolicy,
  emergencyPolicyTest,
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
  readFile(startHandshakePolicyPath, 'utf8'),
  readFile(startHandshakePolicyTestPath, 'utf8'),
  readFile(emergencyPolicyPath, 'utf8'),
  readFile(emergencyPolicyTestPath, 'utf8'),
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
  /LAST_START_REQUEST_AT_KEY[\s\S]*LAST_START_AT_KEY[\s\S]*LAST_STOP_AT_KEY[\s\S]*LAST_STOP_CODE_KEY[\s\S]*LAST_STOP_MESSAGE_KEY/,
  'Native preferences must persist request/start/stop lifecycle timestamps, code, and message.',
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
  /recordProtectionServiceStarted\(Context context\)[\s\S]*ProtectionStartConfirmationResult[\s\S]*LAST_START_AT_KEY[\s\S]*nextLifecycleTimestamp\(preferences\)/,
  'The actual-service-start recorder must return a race-aware confirmation result and persist ordered start evidence.',
);
const setEnabledStart = plugin.indexOf('public static void setProtectionEnabled');
const actualStartRecorderStart = plugin.indexOf('public static ProtectionStartConfirmationResult recordProtectionServiceStarted');
if (setEnabledStart < 0 || actualStartRecorderStart <= setEnabledStart) {
  findings.push(`${pluginPath}: Could not isolate activation and actual-start persistence methods.`);
} else if (plugin.slice(setEnabledStart, actualStartRecorderStart).includes('LAST_START_AT_KEY')) {
  findings.push(`${pluginPath}: Activation requests must not write LAST_START_AT_KEY before the foreground service actually starts.`);
}
requirePattern(
  startHandshakePolicyPath,
  startHandshakePolicy,
  /nextLifecycleTimestamp[\s\S]*hasUnconfirmedStartRequest[\s\S]*isConfirmationSuperseded/,
  'Start-handshake policy must keep strict lifecycle ordering and stop-wins confirmation semantics.',
);
requirePattern(
  startHandshakePolicyTestPath,
  startHandshakePolicyTest,
  /lifecycleTimestampAdvancesStrictlyBeyondKnownBoundary[\s\S]*terminalStopSupersedesDelayedConfirmation/,
  'Start-handshake JUnit must cover strict ordering and stop-wins confirmation.',
);
requirePattern(
  servicePath,
  service,
  /onCreate\(\)[\s\S]*startForeground\(NOTIFICATION_ID, createNotification\(\)\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*confirmation != ScrollShieldNativePlugin\.ProtectionStartConfirmationResult\.CONFIRMED[\s\S]*RUNNING\.set\(true\)/,
  'Foreground creation and race-safe confirmation must succeed before RUNNING=true is recorded.',
);
const onCreateStart = service.indexOf('public void onCreate()');
const onStartCommandStart = service.indexOf('public int onStartCommand', onCreateStart + 1);
if (onCreateStart < 0 || onStartCommandStart <= onCreateStart) {
  findings.push(`${servicePath}: Could not isolate service onCreate lifecycle.`);
} else {
  const onCreateBody = service.slice(onCreateStart, onStartCommandStart);
  const foregroundIndex = onCreateBody.indexOf('startForeground(NOTIFICATION_ID, createNotification())');
  const runningIndex = onCreateBody.indexOf('RUNNING.set(true)');
  const recorderIndex = onCreateBody.indexOf('recordProtectionServiceStarted(this)');
  const rejectIndex = onCreateBody.indexOf('confirmation != ScrollShieldNativePlugin.ProtectionStartConfirmationResult.CONFIRMED');
  if (
    foregroundIndex < 0 ||
    recorderIndex < foregroundIndex ||
    rejectIndex < recorderIndex ||
    runningIndex < rejectIndex
  ) {
    findings.push(
      `${servicePath}: RUNNING must only follow successful startForeground() and a current durable confirmation.`,
    );
  }
}
requirePattern(
  servicePath,
  service,
  /catch \(RuntimeException error\)[\s\S]*RUNNING\.set\(false\)[\s\S]*explicitStopRequested = true[\s\S]*persistProtectionSystemStopWithFallback\([\s\S]*ProtectionStopReasonPolicy\.START_FAILED[\s\S]*stopSelf\(\)[\s\S]*return/,
  'A foreground-start failure must atomically fail closed with START_FAILED and must not create false start evidence.',
);
requirePattern(
  servicePath,
  service,
  /hasUnconfirmedProtectionStartRequest\(this\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*confirmation != ScrollShieldNativePlugin\.ProtectionStartConfirmationResult\.CONFIRMED[\s\S]*START_NOT_STICKY/,
  'A newer restart generation delivered to an existing service must be confirmed or fail closed before it remains sticky.',
);
requirePattern(
  pluginPath,
  plugin,
  /appendProtectionEvent[\s\S]*ProtectionStopReasonPolicy\.classifySystemWarning[\s\S]*LAST_STOP_MESSAGE_KEY/,
  'Legacy system warning events must keep persistent stop diagnostics for compatibility.',
);
requirePattern(
  pluginPath,
  plugin,
  /recordProtectionSystemStop[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, false\)[\s\S]*putString\(EVENT_QUEUE_KEY, events\.toString\(\)\)[\s\S]*putString\(LAST_STOP_CODE_KEY, normalizedCode\)[\s\S]*\.commit\(\)/,
  'Controlled system stops must have one atomic native persistence path for activation, event, and exact diagnostics.',
);
requirePattern(
  pluginPath,
  plugin,
  /persistProtectionSystemStopWithFallback[\s\S]*recordProtectionSystemStop[\s\S]*if \(!persisted\)[\s\S]*setProtectionEnabled[\s\S]*recordProtectionStop/,
  'All controlled system-stop callers must have a shared atomic-first fail-closed fallback wrapper.',
);
requirePattern(
  pluginPath,
  plugin,
  /recordProtectionTerminalStop[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, false\)[\s\S]*putLong\(LAST_STOP_AT_KEY, timestamp\)[\s\S]*putString\(LAST_STOP_CODE_KEY, normalizedCode\)[\s\S]*putString\(LAST_STOP_MESSAGE_KEY, normalizedMessage\)[\s\S]*\.commit\(\)/,
  'Explicit terminal stops must atomically commit disabled state, timestamp, exact code, and message.',
);
requirePattern(
  pluginPath,
  plugin,
  /persistProtectionTerminalStopWithFallback[\s\S]*recordProtectionTerminalStop[\s\S]*if \(!persisted\)[\s\S]*setProtectionEnabled[\s\S]*recordProtectionStop/,
  'Explicit terminal-stop callers must share an atomic-first fallback wrapper.',
);
const terminalStopStart = plugin.indexOf('public static boolean recordProtectionTerminalStop');
const prerequisiteAliasStart = plugin.indexOf('public static boolean recordProtectionPrerequisiteStop', terminalStopStart + 1);
if (terminalStopStart < 0 || prerequisiteAliasStart <= terminalStopStart) {
  findings.push(`${pluginPath}: Could not isolate recordProtectionTerminalStop.`);
} else {
  const terminalStopBody = plugin.slice(terminalStopStart, prerequisiteAliasStart);
  if (terminalStopBody.includes('EVENT_QUEUE_KEY') || terminalStopBody.includes('appendProtectionEvent(')) {
    findings.push(
      `${pluginPath}: Explicit terminal stops must not append or rewrite protection_events; deliberate stops are not system warnings.`,
    );
  }
}
requirePattern(
  pluginPath,
  plugin,
  /recordProtectionPrerequisiteStop[\s\S]*return recordProtectionSystemStop/,
  'Existing prerequisite callers/tests must remain compatible through the generic system-stop transaction.',
);
requirePattern(
  pluginPath,
  plugin,
  /stopProtectionService[\s\S]*reasonCode[\s\S]*reasonMessage[\s\S]*MANUAL_APP_STOP_CODE[\s\S]*persistProtectionTerminalStopWithFallback\(context, reasonCode, reasonMessage\)[\s\S]*stopService/,
  'React explicit stops must use the stable manual fallback and atomic terminal-stop wrapper before stopping the service.',
);
const pluginStopStart = plugin.indexOf('public void stopProtectionService');
const pluginStatusStart = plugin.indexOf('public void getProtectionServiceStatus', pluginStopStart + 1);
if (pluginStopStart < 0 || pluginStatusStart <= pluginStopStart) {
  findings.push(`${pluginPath}: Could not isolate stopProtectionService.`);
} else {
  const pluginStopBody = plugin.slice(pluginStopStart, pluginStatusStart);
  for (const forbiddenWrite of ['setProtectionEnabled(context, false)', 'recordProtectionStop(']) {
    if (pluginStopBody.includes(forbiddenWrite)) {
      findings.push(
        `${pluginPath}: stopProtectionService must not restore separate terminal writes (${forbiddenWrite}); use the atomic terminal-stop wrapper.`,
      );
    }
  }
}
requirePattern(
  pluginPath,
  plugin,
  /startProtectionService[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*catch \(RuntimeException error\)[\s\S]*persistProtectionSystemStopWithFallback\([\s\S]*ProtectionStopReasonPolicy\.START_FAILED/,
  'Native start requests must suppress fresh duplicates, persist a new generation when needed, and retain START_FAILED on service-request exceptions.',
);

for (const code of [
  'usage_access_missing',
  'overlay_permission_missing',
  'notifications_missing',
  'no_active_rules',
  'target_app_missing',
  'start_failed',
  'recovery_start_failed',
  'system_warning',
]) {
  requirePattern(policyPath, policy, new RegExp(`\\b${code}\\b`), `Stop policy is missing code ${code}.`);
  requirePattern(policyTestPath, policyTest, new RegExp(`\\b${code}\\b`), `JUnit coverage is missing code ${code}.`);
}

for (const code of ['manual_app_stop', 'notification_action_stop', 'unexpected_service_destroy']) {
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
  /shouldRecordUnexpectedDestroy[\s\S]*!protectionEnabled \|\| explicitStopRequested[\s\S]*terminalStopAfterThisServiceWasRequested[\s\S]*lastStopAt >= serviceStartRequestAtOnCreate[\s\S]*hasUnconfirmedStartRequest/,
  'Unexpected destroy classification must reject disabled/explicit stops, stale service generations, and pre-confirmation interruptions.',
);
requirePattern(
  serviceLifecyclePolicyTestPath,
  serviceLifecyclePolicyTest,
  /recordsUnexpectedDestroyOnlyForCurrentConfirmedActivation[\s\S]*doesNotLetOldServiceDestroyOverwriteFastRestart[\s\S]*preConfirmationDestroyRemainsStartInterruptedNotUnexpectedDestroy/,
  'Service lifecycle JUnit tests must cover current activation, fast restart, and pre-confirmation destroy boundaries.',
);
requirePattern(
  servicePath,
  service,
  /ACTION_STOP[\s\S]*explicitStopRequested = true[\s\S]*persistProtectionTerminalStopWithFallback\([\s\S]*NOTIFICATION_ACTION_STOP_CODE[\s\S]*stopSelf\(\)/,
  'The persistent notification stop action must atomically persist notification_action_stop before stopping the service.',
);
const actionStopStart = service.indexOf('if (intent != null && ACTION_STOP.equals(intent.getAction()))');
const disabledStart = service.indexOf('if (!ScrollShieldNativePlugin.isProtectionEnabled(this))', actionStopStart + 1);
if (actionStopStart < 0 || disabledStart <= actionStopStart) {
  findings.push(`${servicePath}: Could not isolate notification ACTION_STOP branch.`);
} else {
  const actionStopBody = service.slice(actionStopStart, disabledStart);
  for (const forbiddenWrite of ['setProtectionEnabled(this, false)', 'recordProtectionStop(']) {
    if (actionStopBody.includes(forbiddenWrite)) {
      findings.push(
        `${servicePath}: Notification ACTION_STOP must not restore separate terminal writes (${forbiddenWrite}); use the atomic terminal-stop wrapper.`,
      );
    }
  }
}
requirePattern(
  servicePath,
  service,
  /onDestroy\(\)[\s\S]*latestStartRequestAt[\s\S]*lastStartAt[\s\S]*lastStopAt[\s\S]*shouldRecordUnexpectedDestroy[\s\S]*serviceStartRequestAtOnCreate[\s\S]*if \(unexpectedDestroy\)[\s\S]*persistProtectionSystemStopWithFallback\([\s\S]*UNEXPECTED_SERVICE_DESTROY_CODE/,
  'Unexpected service destruction must classify against service/request generations before atomically persisting unexpected_service_destroy.',
);

const onDestroyStart = service.indexOf('public void onDestroy()');
const onBindStart = service.indexOf('public IBinder onBind', onDestroyStart + 1);
if (onDestroyStart < 0 || onBindStart <= onDestroyStart) {
  findings.push(`${servicePath}: Could not isolate service onDestroy lifecycle.`);
} else {
  const onDestroyBody = service.slice(onDestroyStart, onBindStart);
  for (const forbiddenWrite of [
    'setProtectionEnabled(this, false)',
    'appendProtectionEvent(this, "warning", "system"',
    'recordProtectionStop(',
  ]) {
    if (onDestroyBody.includes(forbiddenWrite)) {
      findings.push(
        `${servicePath}: Unexpected onDestroy must not restore separate terminal writes (${forbiddenWrite}); use the shared atomic system-stop wrapper.`,
      );
    }
  }
}

requirePattern(
  servicePath,
  service,
  /stopForProtectionPrerequisite\(String reasonCode, String description\)[\s\S]*explicitStopRequested = true[\s\S]*persistProtectionSystemStopWithFallback\([\s\S]*reasonCode,[\s\S]*description/,
  'Controlled permission and configuration shutdowns must delegate to the shared atomic system-stop wrapper.',
);

requirePattern(
  emergencyPolicyPath,
  emergencyPolicy,
  /MIN_REASON_CHARACTERS = 3[\s\S]*MAX_REASON_CHARACTERS = 160[\s\S]*resolveCountdownSeconds[\s\S]*normalizeReason[\s\S]*isReasonSatisfied[\s\S]*canEmergencyUnlock/,
  'Emergency unlock policy must guard countdown, reason normalization, and final unlock eligibility.',
);
requirePattern(
  emergencyPolicyTestPath,
  emergencyPolicyTest,
  /requiresIntentionalReasonOnlyWhenConfigured[\s\S]*normalizesAndBoundsLocalReasonText[\s\S]*strictEmergencyUsesExtraCountdownOnlyWhenRequested[\s\S]*unlockRequiresAvailabilityCountdownAndOptionalReason/,
  'Emergency unlock JUnit tests must cover reason, bounds, countdown, and unlock boundaries.',
);
requirePattern(
  bridgePath,
  bridge,
  /emergencyUnlock:[\s\S]*requireCountdown:\s*boolean[\s\S]*requireReason:\s*boolean/,
  'The TypeScript Android config contract must include emergency countdown and reason requirements.',
);
requirePattern(
  bridgePath,
  bridge,
  /requireCountdown:\s*appConfig\?\.emergencyUnlock\.requireCountdown \?\? true[\s\S]*requireReason:\s*appConfig\?\.emergencyUnlock\.requireReason \?\? true/,
  'Emergency friction settings must default safely and be serialized to Android.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /syncs emergency countdown and reason requirements to Android[\s\S]*requireCountdown: false[\s\S]*requireReason: true/,
  'Bridge tests must prove emergency friction settings reach native JSON.',
);
requirePattern(
  servicePath,
  service,
  /optBoolean\("requireCountdown", true\)[\s\S]*optBoolean\("requireReason", true\)/,
  'The Android service must parse emergency countdown and reason requirements.',
);
requirePattern(
  servicePath,
  service,
  /EmergencyUnlockPolicy\.resolveCountdownSeconds[\s\S]*createEmergencyReasonInput[\s\S]*LengthFilter\(EmergencyUnlockPolicy\.MAX_REASON_CHARACTERS\)[\s\S]*EmergencyUnlockPolicy\.canEmergencyUnlock/,
  'The Android overlay must enforce the emergency countdown, bounded reason input, and final eligibility policy.',
);
requirePattern(
  servicePath,
  service,
  /eventDescription \+= " · Grund: " \+ emergencyReason/,
  'Accepted emergency reasons must be retained in the local protection event for user-visible history.',
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
  /stopRecovery[\s\S]*persistProtectionSystemStopWithFallback\(context, code, message\)/,
  'Failed boot/update recovery must delegate to the shared atomic system-stop wrapper.',
);

requirePattern(
  diagnosticsPath,
  diagnostics,
  /lastProtectionStartRequestAt[\s\S]*lastProtectionStartAt[\s\S]*lastProtectionStopAt[\s\S]*lastProtectionStopCode[\s\S]*lastProtectionStopMessage/,
  'Native diagnostic snapshots must expose request/start/stop lifecycle fields.',
);
requirePattern(
  diagnosticsBridgePath,
  diagnosticsBridge,
  /lastProtectionStartRequestAt:\s*number[\s\S]*lastProtectionStartAt:\s*number[\s\S]*lastProtectionStopAt:\s*number[\s\S]*lastProtectionStopCode:\s*string[\s\S]*lastProtectionStopMessage:\s*string/,
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
  /NativeProtectionHealth[\s\S]*start-pending[\s\S]*start-interrupted[\s\S]*running-without-activation[\s\S]*unclean-process-stop[\s\S]*stale-activation[\s\S]*stopped-with-reason[\s\S]*never-started/,
  'The bridge must model pending, interrupted, process-loss, active, stopped, and inconsistent native states explicitly.',
);
requirePattern(
  bridgePath,
  bridge,
  /getStatus\(\)[\s\S]*lastStartRequestAt: normalizeTimestamp\(result\.lastStartRequestAt\)[\s\S]*lastStartAt: normalizeTimestamp\(result\.lastStartAt\)[\s\S]*lastStopAt: normalizeTimestamp\(result\.lastStopAt\)[\s\S]*lastStopCode: normalizeDiagnosticText\(result\.lastStopCode\)[\s\S]*lastStopMessage: normalizeDiagnosticText\(result\.lastStopMessage\)[\s\S]*assessNativeProtectionHealth/,
  'NativeProtection.getStatus must preserve and normalize every lifecycle field instead of discarding it.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /preserves lifecycle diagnostics and detects stale activation[\s\S]*normalizes malformed lifecycle values[\s\S]*distinguishes active, process-loss, inconsistent, and stopped states deterministically/,
  'Bridge tests must cover lifecycle preservation, normalization, process loss, and deterministic health classification.',
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
  /Letzte Startanforderung[\s\S]*Letzter Schutzstart[\s\S]*Letzter Stoppzeitpunkt[\s\S]*Letzter Stoppcode[\s\S]*Letzter Stoppgrund/,
  'Debug UI must display request/start/stop lifecycle diagnostics without requiring JSON inspection.',
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
  'LIFE-11',
  'notification_action_stop',
  'unexpected_service_destroy',
  'lastProtectionStartRequestAt',
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
  'Protection lifecycle diagnostics check passed. Ordered start requests, stop-wins confirmation, fast-restart destroy isolation, actual foreground starts, atomic system/terminal stops, diagnostics, emergency friction, and physical evidence requirements remain guarded.',
);
