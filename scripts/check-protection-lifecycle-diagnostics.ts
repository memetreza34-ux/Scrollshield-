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
  configStore: `${javaRoot}/ProtectionConfigDurabilityStore.java`,
  configStoreTest: `${javaTestRoot}/ProtectionConfigDurabilityStoreTest.java`,
  runtimePolicy: `${javaRoot}/ProtectionConfigRuntimePolicy.java`,
  runtimePolicyTest: `${javaTestRoot}/ProtectionConfigRuntimePolicyTest.java`,
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
  matrix: 'docs/ANDROID_DEVICE_TEST_MATRIX.md',
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

requirePattern('packageJson', /"check:lifecycle":\s*"tsx scripts\/check-protection-lifecycle-diagnostics\.ts"/, 'package.json must expose check:lifecycle.');
requirePattern('packageJson', /"verify":[^\n]*npm run check:lifecycle/, 'check:lifecycle must remain in verify.');
requirePattern('readiness', /args: \['run', 'check:lifecycle'\], required: true/, 'readiness must require check:lifecycle.');

requirePattern(
  'plugin',
  /LAST_START_REQUEST_AT_KEY[\s\S]*LAST_START_AT_KEY[\s\S]*LAST_STOP_AT_KEY[\s\S]*LAST_STOP_CODE_KEY[\s\S]*LAST_STOP_MESSAGE_KEY/,
  'Native preferences must keep ordered lifecycle evidence and exact stop diagnostics.',
);
requirePattern(
  'startPolicy',
  /CONFIRMATION_GRACE_MS\s*=\s*15_000L[\s\S]*MAX_FUTURE_CLOCK_SKEW_MS\s*=\s*5_000L[\s\S]*nextLifecycleTimestamp[\s\S]*hasFreshPendingStartRequest[\s\S]*isConfirmationSuperseded/,
  'Start policy must retain strict ordering, pending timeout and stop-wins semantics.',
);
requirePattern(
  'startPolicyTest',
  /lifecycleTimestampAdvancesStrictlyBeyondKnownBoundary[\s\S]*freshPendingStartUsesBoundedConfirmationWindow[\s\S]*clockRollbackCannotHoldPendingStartForever[\s\S]*terminalStopSupersedesDelayedConfirmation/,
  'Start-policy JUnit must retain ordering, timeout, rollback and stop-wins coverage.',
);

requirePattern(
  'configStore',
  /CONFIG_GENERATION_KEY[\s\S]*START_REQUEST_CONFIG_GENERATION_KEY[\s\S]*commitConfig[\s\S]*\.commit\(\)[\s\S]*ensureGenerationForExistingConfig[\s\S]*isCurrentRequestGeneration/,
  'Lifecycle must be bound to synchronous durable config generations.',
);
forbidText('configStore', '.apply()', 'Start-critical config storage must not use apply().');
requirePattern('configStoreTest', /generationNormalizationAcceptsOnlyCanonicalUuidValues[\s\S]*generationEqualityIsExactAfterNormalization/, 'Config-generation JUnit contract is incomplete.');
requirePattern(
  'runtimePolicy',
  /canUsePublishedRuntimeState[\s\S]*shouldInvalidateRuntimeState/,
  'Lifecycle must retain a separate published runtime config-generation policy.',
);
requirePattern(
  'runtimePolicyTest',
  /certainWritesRequirePublishedGenerationToStillMatchPersistence[\s\S]*uncertainWritesKeepOnlyLastPublishedGenerationUsable[\s\S]*publishedGenerationChangeInvalidatesExistingRuntimeState/,
  'Runtime config JUnit must cover certain, uncertain and generation-change behavior.',
);

requirePattern(
  'plugin',
  /startProtectionService\(PluginCall call\)[\s\S]*expectedConfigGeneration[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*matchesCurrentGeneration\(context, expectedConfigGeneration\)[\s\S]*recordProtectionStartRequested\(context, expectedConfigGeneration\)[\s\S]*startForegroundService\(intent\)/,
  'App start must serialize durable config-generation validation, request persistence and Android dispatch.',
);
requirePattern(
  'plugin',
  /recordProtectionStartRequested\(Context context, String expectedConfigGeneration\)[\s\S]*expected\.equals\(current\)[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, true\)[\s\S]*putLong\(LAST_START_REQUEST_AT_KEY, requestAt\)[\s\S]*START_REQUEST_CONFIG_GENERATION_KEY, current[\s\S]*\.commit\(\)/,
  'Request activation and exact config generation must be one commit.',
);
requirePattern(
  'plugin',
  /recordProtectionServiceStarted\(Context context\)[\s\S]*isConfirmationSuperseded[\s\S]*isCurrentRequestGeneration\(preferences\)[\s\S]*FAILED_CLOSED[\s\S]*putLong\(LAST_START_AT_KEY/,
  'Service confirmation must preserve terminal winners and reject config-generation drift.',
);
requirePattern(
  'boot',
  /synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*startForegroundService\(serviceIntent\)/,
  'Boot/update recovery must use validated durable-config bootstrap plus serialized Android dispatch.',
);

requirePattern(
  'dispatchGuard',
  /static final Object LOCK[\s\S]*CONTROLLED_STOP_DESTROY_WINDOW_NANOS\s*=\s*30_000_000_000L[\s\S]*dispatchControlledStop\(Context context\)[\s\S]*context\.stopService[\s\S]*System\.nanoTime\(\)[\s\S]*consumeControlledStopDestroy/,
  'Dispatch guard must retain shared lock and bounded one-shot destroy suppression.',
);
requirePattern(
  'dispatchGuardTest',
  /successfulControlledStopIsConsumedExactlyOnceByPromptDestroy[\s\S]*staleControlledStopTokenCannotSuppressLaterUnexpectedDestroy[\s\S]*backwardMonotonicInputFailsSafeInsteadOfSuppressingDestroy[\s\S]*failedStopDispatchDoesNotSuppressFutureUnexpectedDestroy/,
  'Dispatch-guard JUnit must retain prompt/stale/rollback/failed-dispatch coverage.',
);
requirePattern(
  'plugin',
  /stopProtectionService\(PluginCall call\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*persistProtectionTerminalStopWithFallback[\s\S]*dispatchControlledStop\(context\)/,
  'App stop evidence and Android stop dispatch must remain serialized.',
);
forbidText('plugin', 'context.stopService(new Intent(context, ScrollShieldProtectionService.class))', 'Plugin must not bypass shared dispatch guard.');
forbidText('service', 'stopSelf()', 'Controlled service shutdown must not bypass shared dispatch guard.');

requirePattern(
  'plugin',
  /recordProtectionSystemStop[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, false\)[\s\S]*putString\(EVENT_QUEUE_KEY, events\.toString\(\)\)[\s\S]*putLong\(LAST_STOP_AT_KEY, timestamp\)[\s\S]*putString\(LAST_STOP_CODE_KEY, normalizedCode\)[\s\S]*\.commit\(\)/,
  'System stop must atomically persist disabled state, warning event and exact diagnostics.',
);
requirePattern(
  'plugin',
  /recordProtectionTerminalStop[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, false\)[\s\S]*putLong\(LAST_STOP_AT_KEY, timestamp\)[\s\S]*putString\(LAST_STOP_CODE_KEY, normalizedCode\)[\s\S]*putString\(LAST_STOP_MESSAGE_KEY, normalizedMessage\)[\s\S]*\.commit\(\)/,
  'Terminal stop must atomically persist disabled state and exact diagnostics.',
);

requirePattern(
  'service',
  /onCreate\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*startForeground\(NOTIFICATION_ID, createNotification\(\)\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*RUNNING\.set\(true\)/,
  'Service creation must confirm durable current request before RUNNING=true.',
);
requirePattern(
  'service',
  /onStartCommand[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*hasUnconfirmedProtectionStartRequest\(this\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*serviceStartRequestAtOnCreate = ScrollShieldNativePlugin\.getLastProtectionStartRequestAt\(this\)[\s\S]*refreshProtectionNotification\(\)/,
  'Same-instance restart must confirm/adopt new generation and refresh notification ownership.',
);
requirePattern(
  'service',
  /onDestroy\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*RUNNING\.set\(false\)[\s\S]*publishedConfigGeneration = ""[\s\S]*consumeControlledStopDestroy\(\)[\s\S]*shouldRecordUnexpectedDestroy[\s\S]*UNEXPECTED_SERVICE_DESTROY_CODE/,
  'onDestroy must clear live runtime-generation evidence and classify only true unexpected destruction.',
);
requirePattern(
  'service',
  /refreshConfiguration\(\)[\s\S]*if \(!ProtectionConfigDurabilityStore\.isWriteStateCertain\(\)\) return;[\s\S]*shouldInvalidateRuntimeState[\s\S]*publishedConfigGeneration = configGeneration[\s\S]*temporaryAccessUntil\.clear\(\)[\s\S]*hideOverlay\(\)/,
  'Lifecycle must preserve last published rules during uncertainty and invalidate grants/overlay on confirmed generation change.',
);
requirePattern(
  'service',
  /showOverlay\([\s\S]*actionConfigGeneration = cachedConfigGeneration[\s\S]*setOnClickListener[\s\S]*isCurrentRuntimeConfigGeneration\(actionConfigGeneration\)[\s\S]*temporaryAccessUntil\.put/,
  'Old overlay actions must be generation-checked before creating runtime grants.',
);

requirePattern(
  'service',
  /EXTRA_STOP_START_REQUEST_AT[\s\S]*createNotification\(\)[\s\S]*putExtra\(EXTRA_STOP_START_REQUEST_AT, serviceStartRequestAtOnCreate\)[\s\S]*FLAG_UPDATE_CURRENT \| PendingIntent\.FLAG_IMMUTABLE/,
  'Notification stop PendingIntent must carry lifecycle generation.',
);
requirePattern(
  'lifecyclePolicy',
  /isCurrentNotificationStopGeneration[\s\S]*actionStartRequestAt > 0L[\s\S]*actionStartRequestAt == serviceStartRequestAt[\s\S]*actionStartRequestAt == latestStartRequestAt/,
  'Notification stop must require exact current generation.',
);
requirePattern('lifecyclePolicyTest', /notificationStopIsAcceptedOnlyForCurrentLifecycleGeneration/, 'Missing notification generation JUnit.');
requirePattern(
  'service',
  /ACTION_STOP\.equals\(intent\.getAction\(\)\)[\s\S]*isCurrentNotificationStopGeneration[\s\S]*return START_STICKY[\s\S]*NOTIFICATION_ACTION_STOP_CODE/,
  'Stale ACTION_STOP must be ignored before terminal persistence.',
);

requirePattern(
  'lifecyclePolicy',
  /shouldRecordUnexpectedDestroy[\s\S]*if \(!protectionEnabled\) return false[\s\S]*terminalStopAfterThisServiceWasRequested[\s\S]*currentRequestIsConfirmed[\s\S]*if \(explicitStopRequested && !currentRequestIsConfirmed\) return false[\s\S]*hasUnconfirmedStartRequest/,
  'Unexpected-destroy policy must remain generation-aware after same-instance restart.',
);
requirePattern(
  'lifecyclePolicyTest',
  /recordsUnexpectedDestroyOnlyForCurrentConfirmedActivation[\s\S]*explicitStopWithoutNewConfirmedGenerationSuppressesUnexpectedDestroy[\s\S]*doesNotLetOldServiceDestroyOverwriteFastRestart[\s\S]*transferredRestartOwnershipRestoresUnexpectedDestroyDetection[\s\S]*transferredRestartOwnershipAlsoSupersedesStaleExplicitStopFlag[\s\S]*preConfirmationDestroyRemainsStartInterruptedNotUnexpectedDestroy/,
  'Lifecycle JUnit must retain current activation, fast restart, ownership transfer and pre-confirmation coverage.',
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
  'Bridge must retain all lifecycle health states.',
);
requirePattern(
  'bridge',
  /CONFIG_GENERATION_PATTERN[\s\S]*syncCommittedConfig[\s\S]*expectedConfigGeneration: synced\.configGeneration/,
  'Bridge must bind normal/recovery starts to durable config generation.',
);
requirePattern('bridgeTest', /starts only with the exact durable config generation returned by native sync[\s\S]*fails closed before start when native sync does not confirm a valid config generation/, 'Bridge tests must cover durable config generation start semantics.');
requirePattern('bridgeTest', /detects a pending start request during the confirmation grace window[\s\S]*detects an interrupted start request after the confirmation grace window/, 'Bridge tests must retain pending/interrupted classification.');
requirePattern('clockTest', /tolerates only a small future skew for a fresh pending request[\s\S]*fails out of pending when the wall clock moved materially backward/, 'Clock rollback contract is missing.');
requirePattern('health', /case 'start-pending':[\s\S]*STARTET[\s\S]*case 'start-interrupted':[\s\S]*START ABGEBROCHEN[\s\S]*case 'unclean-process-stop':[\s\S]*PROZESS ABGEBROCHEN/, 'Health presentation must remain explicit.');

requirePattern(
  'diagnostics',
  /protectionConfigGeneration[\s\S]*protectionConfigWriteStateCertain[\s\S]*protectionRuntimeConfigGeneration[\s\S]*startRequestConfigGeneration[\s\S]*lastProtectionStartRequestAt[\s\S]*lastProtectionStartAt[\s\S]*lastProtectionStopAt[\s\S]*lastProtectionStopCode[\s\S]*lastProtectionStopMessage/,
  'Native diagnostics must expose persisted/runtime config and lifecycle evidence.',
);
requirePattern(
  'diagnosticsBridge',
  /protectionConfigGeneration:\s*string[\s\S]*protectionConfigWriteStateCertain:\s*boolean[\s\S]*protectionRuntimeConfigGeneration:\s*string[\s\S]*startRequestConfigGeneration:\s*string[\s\S]*lastProtectionStartRequestAt:\s*number[\s\S]*lastProtectionStartAt:\s*number[\s\S]*lastProtectionStopAt:\s*number/,
  'TypeScript diagnostics must type persisted/runtime config and lifecycle evidence.',
);
requirePattern('debug', /Config-Schreibzustand[\s\S]*Config-Generation[\s\S]*Runtime-Config[\s\S]*Startrequest-Config[\s\S]*Letzte Startanforderung[\s\S]*Letzter Schutzstart[\s\S]*Letzter Stoppcode/, 'Debug UI must retain runtime config and lifecycle evidence rows.');
requirePattern('debugTest', /protectionRuntimeConfigGeneration[\s\S]*Runtime-Config[\s\S]*notifications_missing/, 'Debug regression test must retain runtime config and exact stop diagnostics.');
requirePattern('permissions', /NativeProtection\.getStatus\(\)[\s\S]*NativeProtectionStatusPanel/, 'Permissions screen must render native truth.');
requirePattern('permissionsTest', /Wiederherstellung[\s\S]*Schutz/, 'Permissions tests must retain recovery behavior.');

for (const id of ['LIFE-12', 'LIFE-13', 'LIFE-14', 'LIFE-15', 'APP-07', 'APP-08', 'APP-09', 'APP-10']) {
  requirePattern('matrix', new RegExp(`\\| ${id} \\|`), `Device matrix is missing ${id}.`);
}
requirePattern('dispatchSpec', /DISPATCH-01[\s\S]*DISPATCH-02[\s\S]*DISPATCH-03[\s\S]*DISPATCH-04[\s\S]*DISPATCH-05/, 'Dispatch race specification is incomplete.');
requirePattern('configSpec', /commit\(\)[\s\S]*writeStateCertain[\s\S]*temporary[\s\S]*overlay[\s\S]*APP-07[\s\S]*APP-08[\s\S]*APP-09[\s\S]*APP-10/i, 'Config durability lifecycle specification is incomplete.');

if (findings.length > 0) {
  console.log('Protection lifecycle diagnostics check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection lifecycle diagnostics check passed. Durable config-bound starts, runtime config generation, stale grant/overlay invalidation, atomic stops, serialized dispatch, stale notification rejection, lifecycle health, diagnostics and physical evidence remain guarded.',
);
