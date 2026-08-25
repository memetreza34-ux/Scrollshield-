import { readFile } from 'node:fs/promises';

const javaRoot = 'android/app/src/main/java/app/scrollshield/mobile';
const javaTestRoot = 'android/app/src/test/java/app/scrollshield/mobile';

const paths = {
  packageJson: 'package.json',
  readiness: 'scripts/readiness-report.ts',
  plugin: `${javaRoot}/ScrollShieldNativePlugin.java`,
  service: `${javaRoot}/ScrollShieldProtectionService.java`,
  boot: `${javaRoot}/ScrollShieldBootReceiver.java`,
  dispatchGuard: `${javaRoot}/ProtectionServiceDispatchGuard.java`,
  dispatchGuardTest: `${javaTestRoot}/ProtectionServiceDispatchGuardTest.java`,
  stopPolicy: `${javaRoot}/ProtectionStopReasonPolicy.java`,
  stopPolicyTest: `${javaTestRoot}/ProtectionStopReasonPolicyTest.java`,
  lifecyclePolicy: `${javaRoot}/ProtectionServiceLifecyclePolicy.java`,
  lifecyclePolicyTest: `${javaTestRoot}/ProtectionServiceLifecyclePolicyTest.java`,
  startPolicy: `${javaRoot}/ProtectionStartHandshakePolicy.java`,
  startPolicyTest: `${javaTestRoot}/ProtectionStartHandshakePolicyTest.java`,
  diagnostics: `${javaRoot}/ScrollShieldDiagnosticsPlugin.java`,
  bridge: 'src/lib/nativeProtection.ts',
  bridgeTest: 'src/lib/nativeProtection.test.ts',
  clockTest: 'src/lib/nativeProtection.clock.test.ts',
  health: 'src/lib/nativeProtectionHealth.ts',
  diagnosticsBridge: 'src/lib/nativeDiagnostics.ts',
  debug: 'src/screens/DebugScreen.tsx',
  debugTest: 'src/screens/DebugScreen.test.tsx',
  permissions: 'src/screens/PermissionsScreen.tsx',
  permissionsTest: 'src/screens/PermissionsScreen.test.tsx',
  app: 'src/App.tsx',
  appTest: 'src/App.migration.test.tsx',
  emergencyPolicy: `${javaRoot}/EmergencyUnlockPolicy.java`,
  emergencyPolicyTest: `${javaTestRoot}/EmergencyUnlockPolicyTest.java`,
  matrix: 'docs/ANDROID_DEVICE_TEST_MATRIX.md',
} as const;

const entries = await Promise.all(
  Object.entries(paths).map(async ([key, file]) => [key, await readFile(file, 'utf8')] as const),
);
const source = Object.fromEntries(entries) as Record<keyof typeof paths, string>;
const findings: string[] = [];

function requirePattern(key: keyof typeof paths, pattern: RegExp, message: string) {
  if (!pattern.test(source[key])) findings.push(`${paths[key]}: ${message}`);
}

function forbidText(key: keyof typeof paths, text: string, message: string) {
  if (source[key].includes(text)) findings.push(`${paths[key]}: ${message}`);
}

requirePattern(
  'packageJson',
  /"check:lifecycle":\s*"tsx scripts\/check-protection-lifecycle-diagnostics\.ts"/,
  'package.json must expose check:lifecycle.',
);
requirePattern(
  'packageJson',
  /"verify":[^\n]*npm run check:lifecycle/,
  'check:lifecycle must remain in npm run verify.',
);
requirePattern(
  'readiness',
  /args: \['run', 'check:lifecycle'\], required: true/,
  'readiness must execute check:lifecycle as required.',
);

requirePattern(
  'plugin',
  /LAST_START_REQUEST_AT_KEY[\s\S]*LAST_START_AT_KEY[\s\S]*LAST_STOP_AT_KEY[\s\S]*LAST_STOP_CODE_KEY[\s\S]*LAST_STOP_MESSAGE_KEY/,
  'Native preferences must keep request/start/stop timestamps and exact diagnostics.',
);
requirePattern(
  'startPolicy',
  /CONFIRMATION_GRACE_MS\s*=\s*15_000L[\s\S]*MAX_FUTURE_CLOCK_SKEW_MS\s*=\s*5_000L[\s\S]*nextLifecycleTimestamp[\s\S]*hasUnconfirmedStartRequest[\s\S]*hasFreshPendingStartRequest[\s\S]*isConfirmationSuperseded/,
  'Start policy must own grace/skew, strict ordering, pending detection and stop-wins confirmation.',
);
requirePattern(
  'startPolicyTest',
  /lifecycleTimestampAdvancesStrictlyBeyondKnownBoundary[\s\S]*freshPendingStartUsesBoundedConfirmationWindow[\s\S]*clockRollbackCannotHoldPendingStartForever[\s\S]*terminalStopSupersedesDelayedConfirmation/,
  'Start-policy JUnit must lock ordering, grace, rollback and stop-wins semantics.',
);

requirePattern(
  'dispatchGuard',
  /static final Object LOCK[\s\S]*CONTROLLED_STOP_DESTROY_WINDOW_NANOS\s*=\s*30_000_000_000L[\s\S]*dispatchControlledStop\(Context context\)[\s\S]*context\.stopService[\s\S]*consumeControlledStopDestroy/,
  'Dispatch guard must serialize real Android service stops and own bounded controlled-destroy suppression.',
);
requirePattern(
  'dispatchGuardTest',
  /successfulControlledStopIsConsumedExactlyOnceByPromptDestroy[\s\S]*staleControlledStopTokenCannotSuppressLaterUnexpectedDestroy[\s\S]*backwardMonotonicInputFailsSafeInsteadOfSuppressingDestroy[\s\S]*failedStopDispatchDoesNotSuppressFutureUnexpectedDestroy/,
  'Dispatch-guard JUnit must cover prompt, stale, rollback and failed-dispatch token boundaries.',
);

requirePattern(
  'plugin',
  /startProtectionService\(PluginCall call\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*startForegroundService\(intent\)/,
  'App start must serialize pending check, durable request and Android service dispatch.',
);
requirePattern(
  'plugin',
  /stopProtectionService\(PluginCall call\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*persistProtectionTerminalStopWithFallback[\s\S]*dispatchControlledStop\(context\)/,
  'App stop must serialize exact terminal evidence and Android service stop.',
);
requirePattern(
  'plugin',
  /rejectProtectionStartPrerequisite[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*persistProtectionSystemStopWithFallback[\s\S]*dispatchControlledStop/,
  'Start prerequisite rejection must fail closed under the dispatch lock.',
);
requirePattern(
  'plugin',
  /factoryResetProtectionData[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*markFactoryReset[\s\S]*dispatchControlledStop/,
  'Factory reset tombstone and service-stop dispatch must not race a new start.',
);
forbidText(
  'plugin',
  'context.stopService(new Intent(context, ScrollShieldProtectionService.class))',
  'Plugin lifecycle methods must not bypass the shared dispatch guard.',
);

requirePattern(
  'boot',
  /synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*startForegroundService\(serviceIntent\)/,
  'Boot/update recovery must serialize durable request and Android start dispatch.',
);
requirePattern(
  'boot',
  /stopRecoveryLocked[\s\S]*persistProtectionSystemStopWithFallback[\s\S]*dispatchControlledStop/,
  'Recovery failure must serialize system-stop evidence and Android service stop.',
);

requirePattern(
  'plugin',
  /persistProtectionSystemStopWithFallback[\s\S]*synchronized \(EVENT_LOCK\)[\s\S]*recordProtectionSystemStop[\s\S]*if \(!persisted\)[\s\S]*setProtectionEnabled[\s\S]*recordProtectionStop/,
  'System-stop fallback sequence must remain serialized under EVENT_LOCK.',
);
requirePattern(
  'plugin',
  /persistProtectionTerminalStopWithFallback[\s\S]*synchronized \(EVENT_LOCK\)[\s\S]*recordProtectionTerminalStop[\s\S]*if \(!persisted\)[\s\S]*setProtectionEnabled[\s\S]*recordProtectionStop/,
  'Terminal-stop fallback sequence must remain serialized under EVENT_LOCK.',
);
requirePattern(
  'plugin',
  /recordProtectionSystemStop[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, false\)[\s\S]*putString\(EVENT_QUEUE_KEY, events\.toString\(\)\)[\s\S]*putLong\(LAST_STOP_AT_KEY, timestamp\)[\s\S]*putString\(LAST_STOP_CODE_KEY, normalizedCode\)[\s\S]*\.commit\(\)/,
  'System stop must atomically persist disabled state, warning event and exact diagnostics.',
);
requirePattern(
  'plugin',
  /recordProtectionTerminalStop[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, false\)[\s\S]*putLong\(LAST_STOP_AT_KEY, timestamp\)[\s\S]*putString\(LAST_STOP_CODE_KEY, normalizedCode\)[\s\S]*putString\(LAST_STOP_MESSAGE_KEY, normalizedMessage\)[\s\S]*\.commit\(\)/,
  'Explicit terminal stop must atomically persist disabled state and exact diagnostics without a warning event.',
);

requirePattern(
  'service',
  /onCreate\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*startForeground\(NOTIFICATION_ID, createNotification\(\)\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*dispatchControlledStop\(this\)[\s\S]*RUNNING\.set\(true\)/,
  'Service creation must serialize foreground creation, durable confirmation and fail-closed dispatch.',
);
requirePattern(
  'service',
  /onStartCommand[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*ACTION_STOP[\s\S]*persistProtectionTerminalStopWithFallback[\s\S]*dispatchControlledStop\(this\)[\s\S]*hasUnconfirmedProtectionStartRequest\(this\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*serviceStartRequestAtOnCreate = ScrollShieldNativePlugin\.getLastProtectionStartRequestAt\(this\)/,
  'Service commands must serialize stop actions and transfer a confirmed restart generation to the living instance.',
);
forbidText(
  'service',
  'stopSelf()',
  'Controlled service shutdown must not bypass serialized stopService dispatch.',
);
requirePattern(
  'service',
  /stopForProtectionPrerequisite[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*persistProtectionSystemStopWithFallback[\s\S]*dispatchControlledStop\(this\)/,
  'Runtime prerequisite loss must serialize system-stop evidence and Android stop dispatch.',
);
requirePattern(
  'service',
  /onDestroy\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*RUNNING\.set\(false\)[\s\S]*consumeControlledStopDestroy\(\)[\s\S]*if \(!controlledDispatchDestroy\)[\s\S]*shouldRecordUnexpectedDestroy[\s\S]*UNEXPECTED_SERVICE_DESTROY_CODE/,
  'onDestroy must publish dying state, consume only prompt controlled destroys and classify true unexpected destruction under the same dispatch lock.',
);

requirePattern(
  'lifecyclePolicy',
  /shouldRecordUnexpectedDestroy[\s\S]*!protectionEnabled \|\| explicitStopRequested[\s\S]*terminalStopAfterThisServiceWasRequested[\s\S]*hasUnconfirmedStartRequest/,
  'Unexpected-destroy policy must reject disabled, explicit, old-generation and pre-confirmation cases.',
);
requirePattern(
  'lifecyclePolicyTest',
  /recordsUnexpectedDestroyOnlyForCurrentConfirmedActivation[\s\S]*doesNotLetOldServiceDestroyOverwriteFastRestart[\s\S]*transferredRestartOwnershipRestoresUnexpectedDestroyDetection[\s\S]*preConfirmationDestroyRemainsStartInterruptedNotUnexpectedDestroy/,
  'Lifecycle JUnit must cover current activation, fast restart, ownership transfer and pre-confirmation destruction.',
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
  requirePattern('stopPolicy', new RegExp(`\\b${code}\\b`), `Stop policy is missing ${code}.`);
  requirePattern('stopPolicyTest', new RegExp(`\\b${code}\\b`), `Stop-policy JUnit is missing ${code}.`);
}
for (const code of ['manual_app_stop', 'notification_action_stop', 'unexpected_service_destroy']) {
  requirePattern('lifecyclePolicy', new RegExp(`\\b${code}\\b`), `Lifecycle policy is missing ${code}.`);
  requirePattern('lifecyclePolicyTest', new RegExp(`\\b${code}\\b`), `Lifecycle JUnit is missing ${code}.`);
}

requirePattern(
  'bridge',
  /NativeProtectionHealth[\s\S]*start-pending[\s\S]*start-interrupted[\s\S]*unclean-process-stop[\s\S]*stale-activation/,
  'Bridge must preserve pending/interrupted/process-loss/stale states.',
);
requirePattern(
  'bridge',
  /START_CONFIRMATION_GRACE_MS\s*=\s*15_000[\s\S]*MAX_FUTURE_CLOCK_SKEW_MS\s*=\s*5_000/,
  'TypeScript health must match native grace and clock-skew bounds.',
);
requirePattern(
  'bridgeTest',
  /detects a pending start request during the confirmation grace window[\s\S]*detects an interrupted start request after the confirmation grace window[\s\S]*unclean process stop/,
  'Vitest must cover pending, timeout and confirmed process-loss classification.',
);
requirePattern(
  'clockTest',
  /tolerates only a small future skew for a fresh pending request[\s\S]*fails out of pending when the wall clock moved materially backward/,
  'Clock-skew Vitest must prove a large rollback cannot keep start-pending forever.',
);
requirePattern(
  'health',
  /case 'start-pending':[\s\S]*STARTET[\s\S]*case 'start-interrupted':[\s\S]*START ABGEBROCHEN[\s\S]*case 'unclean-process-stop':[\s\S]*PROZESS ABGEBROCHEN/,
  'Health presentation must keep pending, interrupted and confirmed process-loss states distinct.',
);

requirePattern(
  'diagnostics',
  /lastProtectionStartRequestAt[\s\S]*lastProtectionStartAt[\s\S]*lastProtectionStopAt[\s\S]*lastProtectionStopCode[\s\S]*lastProtectionStopMessage/,
  'Native diagnostics must expose request/start/stop lifecycle evidence.',
);
requirePattern(
  'diagnosticsBridge',
  /lastProtectionStartRequestAt:\s*number[\s\S]*lastProtectionStartAt:\s*number[\s\S]*lastProtectionStopAt:\s*number[\s\S]*lastProtectionStopCode:\s*string/,
  'TypeScript diagnostics must type lifecycle evidence.',
);
requirePattern(
  'debug',
  /Letzte Startanforderung[\s\S]*Letzter Schutzstart[\s\S]*Letzter Stoppzeitpunkt[\s\S]*Letzter Stoppcode[\s\S]*Letzter Stoppgrund/,
  'Debug UI must show lifecycle ordering without raw JSON inspection.',
);
requirePattern(
  'debugTest',
  /Letzte Startanforderung[\s\S]*notifications_missing/,
  'Debug component test must include request evidence and exact stop code.',
);
requirePattern(
  'permissions',
  /NativeProtection\.getStatus\(\)[\s\S]*NativeProtectionStatusPanel/,
  'Permissions screen must render current native lifecycle truth.',
);
requirePattern(
  'permissionsTest',
  /notifications_missing[\s\S]*NEUSTART NÖTIG/,
  'Permissions integration test must retain exact stale-stop diagnostics.',
);
requirePattern(
  'app',
  /NativeProtection\.stop\(\{[\s\S]*code: 'migration_recovery'/,
  'Migration recovery must retain an explicit native stop reason.',
);
requirePattern(
  'appTest',
  /records the stop reason[\s\S]*code: 'migration_recovery'/,
  'Migration test must require migration_recovery.',
);

requirePattern(
  'emergencyPolicy',
  /MIN_REASON_CHARACTERS = 3[\s\S]*MAX_REASON_CHARACTERS = 160[\s\S]*resolveCountdownSeconds[\s\S]*canEmergencyUnlock/,
  'Emergency unlock policy must keep bounded reason/countdown eligibility.',
);
requirePattern(
  'emergencyPolicyTest',
  /requiresIntentionalReasonOnlyWhenConfigured[\s\S]*unlockRequiresAvailabilityCountdownAndOptionalReason/,
  'Emergency JUnit must retain reason/countdown boundaries.',
);

for (const required of [
  'LIFE-08',
  'LIFE-09',
  'LIFE-10',
  'LIFE-11',
  'LIFE-12',
  'LIFE-13',
  'LIFE-14',
  'notification_action_stop',
  'unexpected_service_destroy',
  'lastProtectionStartRequestAt',
  'lastProtectionStartAt',
  'lastProtectionStopAt',
  'lastProtectionStopCode',
  'lastProtectionStopMessage',
]) {
  requirePattern(
    'matrix',
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Physical-device matrix is missing ${required}.`,
  );
}

if (findings.length > 0) {
  console.log('Protection lifecycle diagnostics check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection lifecycle diagnostics check passed. Durable lifecycle evidence, serialized start/stop dispatch, bounded controlled-destroy suppression, restart ownership transfer, health states, diagnostics and physical evidence requirements remain guarded.',
);
