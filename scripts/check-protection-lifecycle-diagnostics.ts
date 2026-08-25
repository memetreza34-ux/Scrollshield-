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
  dispatchSpec: 'docs/PROTECTION_SERVICE_DISPATCH_RACES.md',
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
  'Native preferences must keep ordered request/start/stop lifecycle evidence and exact stop diagnostics.',
);
requirePattern(
  'startPolicy',
  /CONFIRMATION_GRACE_MS\s*=\s*15_000L[\s\S]*MAX_FUTURE_CLOCK_SKEW_MS\s*=\s*5_000L[\s\S]*nextLifecycleTimestamp[\s\S]*hasFreshPendingStartRequest[\s\S]*isConfirmationSuperseded/,
  'Start policy must retain grace/skew, strict ordering, pending detection and stop-wins confirmation.',
);
requirePattern(
  'startPolicyTest',
  /lifecycleTimestampAdvancesStrictlyBeyondKnownBoundary[\s\S]*freshPendingStartUsesBoundedConfirmationWindow[\s\S]*clockRollbackCannotHoldPendingStartForever[\s\S]*terminalStopSupersedesDelayedConfirmation/,
  'Start-policy JUnit must lock ordering, grace, rollback and stop-wins semantics.',
);

requirePattern(
  'dispatchGuard',
  /static final Object LOCK[\s\S]*CONTROLLED_STOP_DESTROY_WINDOW_NANOS\s*=\s*30_000_000_000L[\s\S]*dispatchControlledStop\(Context context\)[\s\S]*context\.stopService[\s\S]*System\.nanoTime\(\)[\s\S]*consumeControlledStopDestroy/,
  'Dispatch guard must serialize Android service stops and own bounded monotonic controlled-destroy suppression.',
);
requirePattern(
  'dispatchGuardTest',
  /successfulControlledStopIsConsumedExactlyOnceByPromptDestroy[\s\S]*staleControlledStopTokenCannotSuppressLaterUnexpectedDestroy[\s\S]*backwardMonotonicInputFailsSafeInsteadOfSuppressingDestroy[\s\S]*failedStopDispatchDoesNotSuppressFutureUnexpectedDestroy/,
  'Dispatch-guard JUnit must cover prompt, stale, rollback and failed-dispatch token boundaries.',
);

requirePattern(
  'plugin',
  /startProtectionService\(PluginCall call\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*startForegroundService\(intent\)/,
  'App start must serialize pending check, durable request and Android start dispatch.',
);
requirePattern(
  'plugin',
  /stopProtectionService\(PluginCall call\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*persistProtectionTerminalStopWithFallback[\s\S]*dispatchControlledStop\(context\)/,
  'App stop must serialize exact terminal evidence and Android stop dispatch.',
);
requirePattern(
  'boot',
  /synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*startForegroundService\(serviceIntent\)/,
  'Boot/update recovery must serialize durable request and Android start dispatch.',
);
forbidText(
  'plugin',
  'context.stopService(new Intent(context, ScrollShieldProtectionService.class))',
  'Plugin lifecycle methods must not bypass the shared dispatch guard.',
);
forbidText(
  'service',
  'stopSelf()',
  'Controlled service shutdown must not bypass serialized stopService dispatch.',
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
  'Explicit terminal stop must atomically persist disabled state and exact diagnostics.',
);

requirePattern(
  'service',
  /EXTRA_STOP_START_REQUEST_AT\s*=[\s\S]*STOP_START_REQUEST_AT/,
  'Foreground notification stop actions must carry a dedicated lifecycle-generation extra.',
);
requirePattern(
  'service',
  /createNotification\(\)[\s\S]*setAction\(ACTION_STOP\)[\s\S]*putExtra\(EXTRA_STOP_START_REQUEST_AT, serviceStartRequestAtOnCreate\)[\s\S]*PendingIntent\.FLAG_UPDATE_CURRENT \| PendingIntent\.FLAG_IMMUTABLE/,
  'The current notification PendingIntent must be immutable and updated with the owning start-request generation.',
);
requirePattern(
  'lifecyclePolicy',
  /isCurrentNotificationStopGeneration[\s\S]*actionStartRequestAt > 0L[\s\S]*actionStartRequestAt == serviceStartRequestAt[\s\S]*actionStartRequestAt == latestStartRequestAt/,
  'Notification stop acceptance must require exact action/service/latest generation equality.',
);
requirePattern(
  'lifecyclePolicyTest',
  /notificationStopIsAcceptedOnlyForCurrentLifecycleGeneration/,
  'Lifecycle JUnit must cover current, missing and stale notification-stop generations.',
);
requirePattern(
  'service',
  /ACTION_STOP\.equals\(intent\.getAction\(\)\)[\s\S]*getLongExtra\(EXTRA_STOP_START_REQUEST_AT, 0L\)[\s\S]*getLastProtectionStartRequestAt\(this\)[\s\S]*isCurrentNotificationStopGeneration[\s\S]*return START_STICKY[\s\S]*persistProtectionTerminalStopWithFallback[\s\S]*NOTIFICATION_ACTION_STOP_CODE/,
  'ACTION_STOP must ignore stale generations before any notification_action_stop persistence occurs.',
);
requirePattern(
  'service',
  /serviceStartRequestAtOnCreate = ScrollShieldNativePlugin\.getLastProtectionStartRequestAt\(this\);[\s\S]*refreshProtectionNotification\(\)/,
  'A same-instance confirmed restart must refresh notification ownership after adopting the new request generation.',
);
requirePattern(
  'service',
  /refreshProtectionNotification\(\)[\s\S]*notificationManager\.notify\(NOTIFICATION_ID, createNotification\(\)\)/,
  'Foreground notification must be refreshed after lifecycle-generation ownership transfer.',
);

requirePattern(
  'service',
  /onCreate\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*startForeground\(NOTIFICATION_ID, createNotification\(\)\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*RUNNING\.set\(true\)/,
  'Service creation must serialize foreground creation, durable confirmation and RUNNING publication.',
);
requirePattern(
  'service',
  /onDestroy\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*RUNNING\.set\(false\)[\s\S]*consumeControlledStopDestroy\(\)[\s\S]*shouldRecordUnexpectedDestroy[\s\S]*UNEXPECTED_SERVICE_DESTROY_CODE/,
  'onDestroy must publish dying state and distinguish controlled residual destroys from true unexpected destruction.',
);
requirePattern(
  'lifecyclePolicy',
  /shouldRecordUnexpectedDestroy[\s\S]*if \(!protectionEnabled\) return false[\s\S]*terminalStopAfterThisServiceWasRequested[\s\S]*currentRequestIsConfirmed[\s\S]*if \(explicitStopRequested && !currentRequestIsConfirmed\) return false[\s\S]*hasUnconfirmedStartRequest/,
  'Unexpected-destroy policy must stay generation-aware when an old explicit-stop flag survives a restart.',
);
requirePattern(
  'lifecyclePolicyTest',
  /explicitStopWithoutNewConfirmedGenerationSuppressesUnexpectedDestroy[\s\S]*transferredRestartOwnershipRestoresUnexpectedDestroyDetection[\s\S]*transferredRestartOwnershipAlsoSupersedesStaleExplicitStopFlag/,
  'Lifecycle JUnit must cover explicit-stop suppression and confirmed ownership transfer.',
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
  /detects a pending start request during the confirmation grace window[\s\S]*detects an interrupted start request after the confirmation grace window/,
  'Vitest must cover pending and interrupted start classification.',
);
requirePattern(
  'clockTest',
  /tolerates only a small future skew for a fresh pending request[\s\S]*fails out of pending when the wall clock moved materially backward/,
  'Clock-skew Vitest must prove a large rollback cannot keep start-pending forever.',
);
requirePattern(
  'health',
  /case 'start-pending':[\s\S]*STARTET[\s\S]*case 'start-interrupted':[\s\S]*START ABGEBROCHEN[\s\S]*case 'unclean-process-stop':[\s\S]*PROZESS ABGEBROCHEN/,
  'Health presentation must keep pending, interrupted and process-loss states distinct.',
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
  'Debug UI must expose lifecycle ordering without raw JSON inspection.',
);
requirePattern(
  'debugTest',
  /notifications_missing/,
  'Debug component test must retain exact stop diagnostics.',
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
  /code: 'migration_recovery'/,
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
  'LIFE-15',
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
for (const required of ['DISPATCH-01', 'DISPATCH-02', 'DISPATCH-03', 'DISPATCH-04', 'DISPATCH-05']) {
  requirePattern(
    'dispatchSpec',
    new RegExp(required),
    `Dispatch-race specification is missing ${required}.`,
  );
}

if (findings.length > 0) {
  console.log('Protection lifecycle diagnostics check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection lifecycle diagnostics check passed. Ordered lifecycle evidence, serialized service dispatch, generation-bound notification stops, bounded controlled-destroy suppression, restart ownership transfer, diagnostics, UI health and physical evidence requirements remain guarded.',
);
