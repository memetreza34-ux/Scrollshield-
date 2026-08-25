import { readFile } from 'node:fs/promises';

const javaRoot = 'android/app/src/main/java/app/scrollshield/mobile';
const javaTestRoot = 'android/app/src/test/java/app/scrollshield/mobile';
const androidTestRoot = 'android/app/src/androidTest/java/app/scrollshield/mobile';

const paths = {
  plugin: `${javaRoot}/ScrollShieldNativePlugin.java`,
  service: `${javaRoot}/ScrollShieldProtectionService.java`,
  boot: `${javaRoot}/ScrollShieldBootReceiver.java`,
  dispatchGuard: `${javaRoot}/ProtectionServiceDispatchGuard.java`,
  dispatchGuardTest: `${javaTestRoot}/ProtectionServiceDispatchGuardTest.java`,
  startPolicy: `${javaRoot}/ProtectionStartHandshakePolicy.java`,
  startPolicyTest: `${javaTestRoot}/ProtectionStartHandshakePolicyTest.java`,
  lifecyclePolicy: `${javaRoot}/ProtectionServiceLifecyclePolicy.java`,
  lifecyclePolicyTest: `${javaTestRoot}/ProtectionServiceLifecyclePolicyTest.java`,
  configStore: `${javaRoot}/ProtectionConfigDurabilityStore.java`,
  diagnostics: `${javaRoot}/ScrollShieldDiagnosticsPlugin.java`,
  bridge: 'src/lib/nativeProtection.ts',
  bridgeTest: 'src/lib/nativeProtection.test.ts',
  clockTest: 'src/lib/nativeProtection.clock.test.ts',
  diagnosticsBridge: 'src/lib/nativeDiagnostics.ts',
  health: 'src/lib/nativeProtectionHealth.ts',
  healthTest: 'src/lib/nativeProtectionHealth.test.ts',
  statusPanel: 'src/components/NativeProtectionStatusPanel.tsx',
  statusPanelTest: 'src/components/NativeProtectionStatusPanel.test.tsx',
  instrumentation: `${androidTestRoot}/ProtectionDiagnosticsInstrumentedTest.java`,
  configInstrumentation: `${androidTestRoot}/ProtectionConfigDurabilityInstrumentedTest.java`,
  dispatchSpec: 'docs/PROTECTION_SERVICE_DISPATCH_RACES.md',
  configSpec: 'docs/PROTECTION_CONFIG_DURABILITY.md',
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
  'startPolicy',
  /CONFIRMATION_GRACE_MS\s*=\s*15_000L[\s\S]*MAX_FUTURE_CLOCK_SKEW_MS\s*=\s*5_000L[\s\S]*nextLifecycleTimestamp[\s\S]*hasUnconfirmedStartRequest[\s\S]*hasFreshPendingStartRequest[\s\S]*isConfirmationSuperseded/,
  'Native handshake policy must own grace/skew, ordered timestamps, pending detection and stop-wins confirmation.',
);
requirePattern(
  'startPolicy',
  /boundary == Long\.MAX_VALUE[\s\S]*boundary \+ 1L[\s\S]*Math\.max\(Math\.max\(0L, now\), nextAfterBoundary\)/,
  'Lifecycle timestamps must advance strictly beyond known boundaries when possible.',
);
for (const method of [
  'lifecycleTimestampAdvancesStrictlyBeyondKnownBoundary',
  'freshPendingStartUsesBoundedConfirmationWindow',
  'clockRollbackCannotHoldPendingStartForever',
  'terminalStopSupersedesDelayedConfirmation',
  'unconfirmedBoundaryIsSeparateFromConfirmedOrStoppedState',
]) {
  requirePattern('startPolicyTest', new RegExp(`void\\s+${method}\\s*\\(`), `Missing JUnit ${method}.`);
}

requirePattern(
  'configStore',
  /CONFIG_GENERATION_KEY[\s\S]*START_REQUEST_CONFIG_GENERATION_KEY[\s\S]*commitConfig[\s\S]*\.commit\(\)[\s\S]*matchesCurrentGeneration[\s\S]*isCurrentRequestGeneration/,
  'Start handshake must be backed by durable current/request config generations.',
);
forbidText(
  'configStore',
  '.apply()',
  'Start-critical config durability must never use SharedPreferences.apply().',
);

requirePattern(
  'plugin',
  /startProtectionService\(PluginCall call\)[\s\S]*expectedConfigGeneration[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*matchesCurrentGeneration\(context, expectedConfigGeneration\)[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*recordProtectionStartRequested\(context, expectedConfigGeneration\)[\s\S]*startForegroundService\(intent\)/,
  'App start must serialize exact durable config-generation validation, request persistence and Android dispatch.',
);
requirePattern(
  'plugin',
  /recordProtectionStartRequested\(Context context, String expectedConfigGeneration\)[\s\S]*expected\.equals\(current\)[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, true\)[\s\S]*putLong\(LAST_START_REQUEST_AT_KEY, requestAt\)[\s\S]*START_REQUEST_CONFIG_GENERATION_KEY, current[\s\S]*\.commit\(\)/,
  'Activation intent, request time and exact config generation must be one durable commit.',
);
requirePattern(
  'plugin',
  /recordProtectionStartRequested\(Context context\)[\s\S]*ensureGenerationForExistingConfig\(context\)[\s\S]*recordProtectionStartRequested\(context, generation\)/,
  'Boot/update compatibility may bootstrap only a validated durable existing config.',
);
requirePattern(
  'plugin',
  /recordProtectionServiceStarted\(Context context\)[\s\S]*isConfirmationSuperseded\(enabled, requestAt, stopAt\)[\s\S]*SUPERSEDED_BY_STOP[\s\S]*requestAt <= 0L[\s\S]*isCurrentRequestGeneration\(preferences\)[\s\S]*START_FAILED[\s\S]*FAILED_CLOSED[\s\S]*putLong\(LAST_START_AT_KEY, nextLifecycleTimestamp\(preferences\)\)[\s\S]*CONFIRMED/,
  'Confirmation must preserve a newer stop and fail closed if request/config generation no longer matches.',
);

requirePattern(
  'dispatchGuard',
  /static final Object LOCK[\s\S]*CONTROLLED_STOP_DESTROY_WINDOW_NANOS\s*=\s*30_000_000_000L[\s\S]*dispatchControlledStop\(Context context\)[\s\S]*context\.stopService[\s\S]*System\.nanoTime\(\)/,
  'A single dispatch guard must serialize Android stop dispatch and bound residual destroy suppression.',
);
requirePattern(
  'dispatchGuardTest',
  /successfulControlledStopIsConsumedExactlyOnceByPromptDestroy[\s\S]*staleControlledStopTokenCannotSuppressLaterUnexpectedDestroy[\s\S]*backwardMonotonicInputFailsSafeInsteadOfSuppressingDestroy[\s\S]*failedStopDispatchDoesNotSuppressFutureUnexpectedDestroy/,
  'Dispatch-guard JUnit must cover prompt, stale, backwards-time and failed-dispatch boundaries.',
);
requirePattern(
  'plugin',
  /stopProtectionService\(PluginCall call\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*persistProtectionTerminalStopWithFallback[\s\S]*dispatchControlledStop\(context\)/,
  'App stop persistence and Android stop dispatch must remain serialized against starts.',
);
forbidText('plugin', 'context.stopService(new Intent(context, ScrollShieldProtectionService.class))', 'Plugin must not bypass shared dispatch guard.');

requirePattern(
  'boot',
  /synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*startForegroundService\(serviceIntent\)/,
  'Boot/app-update recovery must use serialized durable-config bootstrap request and Android dispatch.',
);
requirePattern(
  'boot',
  /stopRecoveryLocked[\s\S]*persistProtectionSystemStopWithFallback[\s\S]*dispatchControlledStop\(context\)/,
  'Recovery failures must serialize fail-closed evidence with Android stop dispatch.',
);

requirePattern(
  'service',
  /onCreate\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*serviceStartRequestAtOnCreate = ScrollShieldNativePlugin\.getLastProtectionStartRequestAt\(this\)[\s\S]*startForeground\(NOTIFICATION_ID, createNotification\(\)\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*RUNNING\.set\(true\)/,
  'Service creation must serialize request ownership, foreground creation and generation-safe durable confirmation before RUNNING=true.',
);
requirePattern(
  'service',
  /onStartCommand[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*hasUnconfirmedProtectionStartRequest\(this\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*serviceStartRequestAtOnCreate = ScrollShieldNativePlugin\.getLastProtectionStartRequestAt\(this\)[\s\S]*refreshProtectionNotification\(\)/,
  'A living service must confirm/adopt a newer safe restart request and refresh notification ownership.',
);
forbidText('service', 'stopSelf()', 'Controlled shutdown must not bypass serialized stopService dispatch.');
requirePattern(
  'service',
  /onDestroy\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*RUNNING\.set\(false\)[\s\S]*consumeControlledStopDestroy\(\)[\s\S]*shouldRecordUnexpectedDestroy[\s\S]*UNEXPECTED_SERVICE_DESTROY_CODE/,
  'onDestroy must publish dying state first and distinguish residual from real destruction.',
);

requirePattern(
  'service',
  /EXTRA_STOP_START_REQUEST_AT[\s\S]*createNotification\(\)[\s\S]*putExtra\(EXTRA_STOP_START_REQUEST_AT, serviceStartRequestAtOnCreate\)[\s\S]*FLAG_UPDATE_CURRENT \| PendingIntent\.FLAG_IMMUTABLE/,
  'Notification stop PendingIntent must carry current lifecycle generation.',
);
requirePattern(
  'lifecyclePolicy',
  /isCurrentNotificationStopGeneration[\s\S]*actionStartRequestAt > 0L[\s\S]*actionStartRequestAt == serviceStartRequestAt[\s\S]*actionStartRequestAt == latestStartRequestAt/,
  'Notification stop action must match action/service/latest generation exactly.',
);
requirePattern('lifecyclePolicyTest', /notificationStopIsAcceptedOnlyForCurrentLifecycleGeneration/, 'Missing stale notification generation JUnit.');
requirePattern(
  'service',
  /ACTION_STOP\.equals\(intent\.getAction\(\)\)[\s\S]*isCurrentNotificationStopGeneration[\s\S]*return START_STICKY[\s\S]*NOTIFICATION_ACTION_STOP_CODE/,
  'Stale ACTION_STOP must return before notification_action_stop persistence.',
);
requirePattern('dispatchSpec', /DISPATCH-05[\s\S]*alte Notification-Stop-Aktion nach Restart/, 'Dispatch spec must retain DISPATCH-05.');

requirePattern(
  'lifecyclePolicy',
  /terminalStopAfterThisServiceWasRequested[\s\S]*currentRequestIsConfirmed[\s\S]*explicitStopRequested && !currentRequestIsConfirmed[\s\S]*hasUnconfirmedStartRequest/,
  'Unexpected-destroy classification must remain generation-aware after same-instance restart.',
);
requirePattern(
  'lifecyclePolicyTest',
  /explicitStopWithoutNewConfirmedGenerationSuppressesUnexpectedDestroy[\s\S]*transferredRestartOwnershipRestoresUnexpectedDestroyDetection[\s\S]*transferredRestartOwnershipAlsoSupersedesStaleExplicitStopFlag/,
  'Lifecycle JUnit must retain stale explicit-stop and ownership-transfer coverage.',
);

requirePattern(
  'bridge',
  /CONFIG_GENERATION_PATTERN[\s\S]*syncCommittedConfig[\s\S]*expectedConfigGeneration: synced\.configGeneration/,
  'TypeScript start must validate and forward the exact durable native config generation.',
);
requirePattern(
  'bridgeTest',
  /starts only with the exact durable config generation returned by native sync[\s\S]*fails closed before start when native sync does not confirm a valid config generation/,
  'Vitest must cover generation forwarding and missing-generation fail-closed behavior.',
);
requirePattern(
  'bridge',
  /START_CONFIRMATION_GRACE_MS\s*=\s*15_000[\s\S]*MAX_FUTURE_CLOCK_SKEW_MS\s*=\s*5_000/,
  'TypeScript and native handshake must keep matching grace/skew constants.',
);
requirePattern('bridgeTest', /detects a pending start request during the confirmation grace window[\s\S]*detects an interrupted start request after the confirmation grace window/, 'Vitest must cover pending/interrupted starts.');
requirePattern('clockTest', /tolerates only a small future skew for a fresh pending request[\s\S]*fails out of pending when the wall clock moved materially backward/, 'Clock-skew Vitest must prove material rollback cannot hold pending forever.');
requirePattern('health', /case 'start-pending':[\s\S]*STARTET[\s\S]*case 'start-interrupted':[\s\S]*START ABGEBROCHEN[\s\S]*case 'unclean-process-stop':[\s\S]*PROZESS ABGEBROCHEN/, 'Presentation must keep lifecycle health states distinct.');
requirePattern('healthTest', /shows a neutral in-flight state while Android can still confirm a fresh start request[\s\S]*explains an interrupted start separately from a confirmed process loss/, 'Health tests must cover pending/interrupted distinction.');
requirePattern('statusPanel', /startPending = status\?\.health === 'start-pending'[\s\S]*Start wird bestätigt[\s\S]*startRetry = status\?\.health === 'start-interrupted'[\s\S]*Schutz erneut starten/, 'Status panel must suppress duplicate pending starts and offer retry.');
requirePattern('statusPanelTest', /blocks duplicate starts while a fresh start request is awaiting confirmation[\s\S]*offers a normal retry after an unconfirmed start was interrupted/, 'Status panel tests must cover duplicate suppression/retry.');

requirePattern(
  'diagnostics',
  /protectionConfigGeneration[\s\S]*startRequestConfigGeneration[\s\S]*lastProtectionStartRequestAt[\s\S]*lastProtectionStartAt/,
  'Native diagnostics must expose config generations and lifecycle request/start evidence.',
);
requirePattern(
  'diagnosticsBridge',
  /protectionConfigGeneration:\s*string[\s\S]*startRequestConfigGeneration:\s*string[\s\S]*lastProtectionStartRequestAt:\s*number[\s\S]*lastProtectionStartAt:\s*number/,
  'TypeScript diagnostics must type config and lifecycle generations.',
);

for (const method of [
  'startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence',
  'terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite',
  'restartRequestAdvancesBeyondLatestStopBoundary',
]) {
  requirePattern('instrumentation', new RegExp(`void\\s+${method}\\s*\\(`), `Android lifecycle instrumentation is missing ${method}.`);
}
requirePattern(
  'instrumentation',
  /startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence[\s\S]*prepareDurableConfig[\s\S]*recordProtectionStartRequested\(context, configGeneration\)/,
  'Existing lifecycle instrumentation must use a durable config generation before requesting start.',
);
requirePattern(
  'instrumentation',
  /terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite[\s\S]*SUPERSEDED_BY_STOP[\s\S]*getLastProtectionStopCode[\s\S]*getLastProtectionStopMessage/,
  'Instrumentation must prove delayed confirmation cannot overwrite terminal stop evidence.',
);
for (const method of [
  'durableConfigGenerationBindsStartRequestAndConfirmation',
  'staleConfigGenerationCannotCreateStartRequest',
  'configChangeBeforeConfirmationFailsClosedWithoutConfirmingOldRequest',
  'legacyDurableConfigReceivesGenerationBeforeBootStyleStartRequest',
]) {
  requirePattern('configInstrumentation', new RegExp(`void\\s+${method}\\s*\\(`), `Config durability instrumentation is missing ${method}.`);
}
requirePattern('configSpec', /expectedConfigGeneration[\s\S]*startRequestConfigGeneration[\s\S]*FAILED_CLOSED[\s\S]*APP-07[\s\S]*APP-08/, 'Config durability spec must remain part of the start-handshake contract.');

if (findings.length > 0) {
  console.log('Protection start-handshake check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection start-handshake check passed. Lifecycle ordering, durable config-generation binding, serialized dispatch, stale notification rejection, bounded destroy suppression, restart ownership, health states and Android evidence contracts remain guarded.',
);