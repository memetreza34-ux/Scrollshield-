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
  emergencyPolicy: `${javaRoot}/EmergencyUnlockPolicy.java`,
  emergencyPolicyTest: `${javaTestRoot}/EmergencyUnlockPolicyTest.java`,
  diagnostics: `${javaRoot}/ScrollShieldDiagnosticsPlugin.java`,
  bridge: 'src/lib/nativeProtection.ts',
  bridgeTest: 'src/lib/nativeProtection.test.ts',
  health: 'src/lib/nativeProtectionHealth.ts',
  healthTest: 'src/lib/nativeProtectionHealth.test.ts',
  diagnosticsBridge: 'src/lib/nativeDiagnostics.ts',
  app: 'src/App.tsx',
  appTest: 'src/App.migration.test.tsx',
  debug: 'src/screens/DebugScreen.tsx',
  debugTest: 'src/screens/DebugScreen.test.tsx',
  permissions: 'src/screens/PermissionsScreen.tsx',
  permissionsTest: 'src/screens/PermissionsScreen.test.tsx',
  statusPanel: 'src/components/NativeProtectionStatusPanel.tsx',
  statusPanelTest: 'src/components/NativeProtectionStatusPanel.test.tsx',
  matrix: 'docs/ANDROID_DEVICE_TEST_MATRIX.md',
} as const;

const entries = await Promise.all(
  Object.entries(paths).map(async ([key, file]) => [key, await readFile(file, 'utf8')] as const),
);
const source = Object.fromEntries(entries) as Record<keyof typeof paths, string>;
const findings: string[] = [];

function requirePattern(
  key: keyof typeof paths,
  pattern: RegExp,
  message: string,
) {
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

// Persistent lifecycle truth.
requirePattern(
  'plugin',
  /LAST_START_REQUEST_AT_KEY[\s\S]*LAST_START_AT_KEY[\s\S]*LAST_STOP_AT_KEY[\s\S]*LAST_STOP_CODE_KEY[\s\S]*LAST_STOP_MESSAGE_KEY/,
  'Native preferences must keep request/start/stop timestamps plus exact stop diagnostics.',
);
requirePattern(
  'startPolicy',
  /CONFIRMATION_GRACE_MS\s*=\s*15_000L[\s\S]*MAX_FUTURE_CLOCK_SKEW_MS\s*=\s*5_000L[\s\S]*nextLifecycleTimestamp[\s\S]*hasUnconfirmedStartRequest[\s\S]*hasFreshPendingStartRequest[\s\S]*isConfirmationSuperseded/,
  'Start policy must own grace/skew, strict ordering, pending detection, and stop-wins confirmation.',
);
requirePattern(
  'startPolicyTest',
  /lifecycleTimestampAdvancesStrictlyBeyondKnownBoundary[\s\S]*freshPendingStartUsesBoundedConfirmationWindow[\s\S]*largeClockRollbackDoesNotKeepStartPendingForever[\s\S]*terminalStopSupersedesDelayedConfirmation/,
  'Start-policy JUnit must lock ordering, grace, clock rollback, and stop-wins semantics.',
);

// Start dispatch: durable request and Android dispatch are one serialized operation.
requirePattern(
  'plugin',
  /startProtectionService\(PluginCall call\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*startForegroundService\(intent\)/,
  'App start must hold the dispatch lock across pending check, request persistence, and Android start dispatch.',
);
requirePattern(
  'boot',
  /synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*startForegroundService\(serviceIntent\)/,
  'Boot/update recovery must use the same serialized request-to-dispatch boundary.',
);
requirePattern(
  'plugin',
  /recordProtectionStartRequested\(Context context\)[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, true\)[\s\S]*putLong\(LAST_START_REQUEST_AT_KEY, requestAt\)[\s\S]*\.commit\(\)/,
  'Start intent and request timestamp must remain one durable commit.',
);

// Stop dispatch: durable stop and Android stopService are serialized against starts.
requirePattern(
  'dispatchGuard',
  /static final Object LOCK[\s\S]*dispatchControlledStop\(Context context\)[\s\S]*context\.stopService[\s\S]*noteControlledStopDispatched/,
  'Dispatch guard must own the actual controlled stopService dispatch.',
);
requirePattern(
  'plugin',
  /stopProtectionService\(PluginCall call\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*persistProtectionTerminalStopWithFallback\(context, reasonCode, reasonMessage\)[\s\S]*dispatchControlledStop\(context\)/,
  'App terminal stop must serialize persistence and Android service stop.',
);
requirePattern(
  'plugin',
  /rejectProtectionStartPrerequisite[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*persistProtectionSystemStopWithFallback[\s\S]*dispatchControlledStop/,
  'Start prerequisite rejection must fail closed and stop any live service under the same dispatch lock.',
);
requirePattern(
  'boot',
  /stopRecoveryLocked[\s\S]*persistProtectionSystemStopWithFallback\(context, code, message\)[\s\S]*dispatchControlledStop\(context\)/,
  'Failed recovery must serialize system-stop persistence and service stop.',
);
requirePattern(
  'plugin',
  /factoryResetProtectionData[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*markFactoryReset[\s\S]*dispatchControlledStop\(context\)/,
  'Factory reset tombstone and service-stop dispatch must not race with a new start.',
);
forbidText(
  'plugin',
  'context.stopService(new Intent(context, ScrollShieldProtectionService.class))',
  'Plugin callers must not bypass ProtectionServiceDispatchGuard for direct service stops.',
);

// Atomic persistence and fallback remain serialized under EVENT_LOCK.
requirePattern(
  'plugin',
  /persistProtectionSystemStopWithFallback[\s\S]*synchronized \(EVENT_LOCK\)[\s\S]*recordProtectionSystemStop[\s\S]*if \(!persisted\)[\s\S]*setProtectionEnabled[\s\S]*recordProtectionStop/,
  'System-stop atomic-first fallback must not allow a restart to interleave between fallback writes.',
);
requirePattern(
  'plugin',
  /persistProtectionTerminalStopWithFallback[\s\S]*synchronized \(EVENT_LOCK\)[\s\S]*recordProtectionTerminalStop[\s\S]*if \(!persisted\)[\s\S]*setProtectionEnabled[\s\S]*recordProtectionStop/,
  'Terminal-stop atomic-first fallback must not allow a restart to interleave between fallback writes.',
);
requirePattern(
  'plugin',
  /recordProtectionSystemStop[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, false\)[\s\S]*putString\(EVENT_QUEUE_KEY, events\.toString\(\)\)[\s\S]*putLong\(LAST_STOP_AT_KEY, timestamp\)[\s\S]*putString\(LAST_STOP_CODE_KEY, normalizedCode\)[\s\S]*\.commit\(\)/,
  'System stop must atomically persist disabled state, warning event, timestamp and exact code.',
);
requirePattern(
  'plugin',
  /recordProtectionTerminalStop[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, false\)[\s\S]*putLong\(LAST_STOP_AT_KEY, timestamp\)[\s\S]*putString\(LAST_STOP_CODE_KEY, normalizedCode\)[\s\S]*putString\(LAST_STOP_MESSAGE_KEY, normalizedMessage\)[\s\S]*\.commit\(\)/,
  'Explicit terminal stop must atomically persist disabled state and diagnostics.',
);

// Service creation/commands share the dispatch lock and transfer restart ownership.
requirePattern(
  'service',
  /onCreate\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*startForeground\(NOTIFICATION_ID, createNotification\(\)\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*confirmation != ScrollShieldNativePlugin\.ProtectionStartConfirmationResult\.CONFIRMED[\s\S]*dispatchControlledStop\(this\)[\s\S]*RUNNING\.set\(true\)/,
  'Service creation must serialize foreground start, durable confirmation, fail-closed stop, and RUNNING publication.',
);
requirePattern(
  'service',
  /onStartCommand[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*ACTION_STOP[\s\S]*persistProtectionTerminalStopWithFallback[\s\S]*dispatchControlledStop\(this\)[\s\S]*hasUnconfirmedProtectionStartRequest\(this\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*serviceStartRequestAtOnCreate = ScrollShieldNativePlugin\.getLastProtectionStartRequestAt\(this\)/,
  'Existing service instances must serialize commands and adopt a newly confirmed restart generation.',
);
forbidText(
  'service',
  'stopSelf()',
  'Controlled service shutdown must not bypass the serialized dispatch guard with stopSelf().',
);
requirePattern(
  'service',
  /stopForProtectionPrerequisite[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*persistProtectionSystemStopWithFallback[\s\S]*dispatchControlledStop\(this\)/,
  'Runtime prerequisite loss must serialize exact system-stop evidence with Android stop dispatch.',
);

// A controlled stop request suppresses only its prompt residual onDestroy.
requirePattern(
  'dispatchGuard',
  /CONTROLLED_STOP_DESTROY_WINDOW_NANOS\s*=\s*30_000_000_000L[\s\S]*controlledStopAwaitingDestroy[\s\S]*System\.nanoTime\(\)[\s\S]*consumeControlledStopDestroy[\s\S]*ageNanos >= 0L[\s\S]*ageNanos <= CONTROLLED_STOP_DESTROY_WINDOW_NANOS/,
  'Controlled-stop destroy token must be monotonic, bounded, and one-shot.',
);
requirePattern(
  'dispatchGuardTest',
  /successfulControlledStopIsConsumedExactlyOnceByPromptDestroy[\s\S]*staleControlledStopTokenCannotSuppressLaterUnexpectedDestroy[\s\S]*backwardMonotonicInputFailsSafeInsteadOfSuppressingDestroy[\s\S]*failedStopDispatchDoesNotSuppressFutureUnexpectedDestroy/,
  'Dispatch-guard JUnit must cover prompt, stale, backwards-time and failed-dispatch token boundaries.',
);
requirePattern(
  'service',
  /onDestroy\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*RUNNING\.set\(false\)[\s\S]*consumeControlledStopDestroy\(\)[\s\S]*if \(!controlledDispatchDestroy\)[\s\S]*shouldRecordUnexpectedDestroy[\s\S]*UNEXPECTED_SERVICE_DESTROY_CODE/,
  'onDestroy must publish dying state first, consume prompt controlled destroys, then classify a real unexpected destroy atomically against dispatches.',
);
requirePattern(
  'lifecyclePolicy',
  /shouldRecordUnexpectedDestroy[\s\S]*!protectionEnabled \|\| explicitStopRequested[\s\S]*terminalStopAfterThisServiceWasRequested[\s\S]*hasUnconfirmedStartRequest/,
  'Unexpected-destroy policy must reject disabled, explicit, old-generation and pre-confirmation cases.',
);
requirePattern(
  'lifecyclePolicyTest',
  /recordsUnexpectedDestroyOnlyForCurrentConfirmedActivation[\s\S]*doesNotLetOldServiceDestroyOverwriteFastRestart[\s\S]*transferredRestartOwnershipRestoresUnexpectedDestroyDetection[\s\S]*preConfirmationDestroyRemainsStartInterruptedNotUnexpectedDestroy/,
  'Lifecycle JUnit must cover current activation, residual old generation, transferred ownership and pre-confirmation destroy.',
);

// Stable stop codes remain source-locked.
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

// TypeScript health and UI remain tied to native truth.
requirePattern(
  'bridge',
  /NativeProtectionHealth[\s\S]*start-pending[\s\S]*start-interrupted[\s\S]*unclean-process-stop[\s\S]*stale-activation/,
  'Bridge must preserve pending/interrupted/process-loss/stale states.',
);
requirePattern(
  'bridge',
  /START_CONFIRMATION_GRACE_MS\s*=\s*15_000[\s\S]*MAX_FUTURE_CLOCK_SKEW_MS\s*=\s*5_000/,
  'TypeScript health must match native grace and clock-skew limits.',
);
requirePattern(
  'bridgeTest',
  /detects a pending start request during the confirmation grace window[\s\S]*detects an interrupted start request after the confirmation grace window[\s\S]*treats a large clock rollback as an interrupted start instead of permanent pending/,
  'Vitest must cover pending, timeout and clock-rollback classification.',
);
requirePattern(
  'health',
  /case 'start-pending':[\s\S]*STARTET[\s\S]*case 'start-interrupted':[\s\S]*START ABGEBROCHEN[\s\S]*case 'unclean-process-stop':[\s\S]*PROZESS ABGEBROCHEN/,
  'Health presentation must keep pending, interrupted and process-loss messaging distinct.',
);
requirePattern(
  'statusPanel',
  /startPending = status\?\.health === 'start-pending'[\s\S]*Start wird bestätigt[\s\S]*startRetry = status\?\.health === 'start-interrupted'[\s\S]*Schutz erneut starten/,
  'Status panel must suppress pending duplicate starts and offer normal retry after interruption.',
);
requirePattern(
  'statusPanelTest',
  /blocks duplicate starts while a fresh start request is awaiting confirmation[\s\S]*offers a normal retry after an unconfirmed start was interrupted/,
  'Status-panel tests must cover pending suppression and interrupted retry.',
);

// Diagnostics and migration contracts remain visible.
requirePattern(
  'diagnostics',
  /lastProtectionStartRequestAt[\s\S]*lastProtectionStartAt[\s\S]*lastProtectionStopAt[\s\S]*lastProtectionStopCode[\s\S]*lastProtectionStopMessage/,
  'Native diagnostics must expose request/start/stop evidence.',
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
  'app',
  /NativeProtection\.stop\(\{[\s\S]*code: 'migration_recovery'/,
  'Migration recovery must retain an explicit native stop reason.',
);
requirePattern(
  'appTest',
  /records the stop reason[\s\S]*code: 'migration_recovery'/,
  'Migration test must require migration_recovery.',
);

// Existing emergency and permissions contracts remain part of lifecycle safety.
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
  'Protection lifecycle diagnostics check passed. Durable lifecycle evidence, serialized start/stop dispatch, bounded controlled-destroy suppression, restart ownership transfer, native diagnostics, UI health and physical evidence requirements remain guarded.',
);
