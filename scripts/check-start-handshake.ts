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
  bridge: 'src/lib/nativeProtection.ts',
  bridgeTest: 'src/lib/nativeProtection.test.ts',
  preparedStartTest: 'src/lib/nativeProtectionPreparedStart.test.ts',
  app: 'src/App.tsx',
  appTest: 'src/App.protectionRecovery.test.tsx',
  health: 'src/lib/nativeProtectionHealth.ts',
  statusPanel: 'src/components/NativeProtectionStatusPanel.tsx',
  instrumentation: `${androidTestRoot}/ProtectionDiagnosticsInstrumentedTest.java`,
  configInstrumentation: `${androidTestRoot}/ProtectionConfigDurabilityInstrumentedTest.java`,
  dispatchSpec: 'docs/PROTECTION_SERVICE_DISPATCH_RACES.md',
  startSpec: 'docs/PROTECTION_START_HANDSHAKE.md',
} as const;

type Key = keyof typeof paths;
const entries = await Promise.all(
  Object.entries(paths).map(async ([key, file]) => [key, await readFile(file, 'utf8')] as const),
);
const source = Object.fromEntries(entries) as Record<Key, string>;
const findings: string[] = [];

function requirePattern(key: Key, pattern: RegExp, message: string) {
  if (!pattern.test(source[key])) findings.push(`${paths[key]}: ${message}`);
}
function forbidText(key: Key, text: string, message: string) {
  if (source[key].includes(text)) findings.push(`${paths[key]}: ${message}`);
}

requirePattern(
  'startPolicy',
  /CONFIRMATION_GRACE_MS\s*=\s*15_000L[\s\S]*MAX_FUTURE_CLOCK_SKEW_MS\s*=\s*5_000L[\s\S]*nextLifecycleTimestamp[\s\S]*hasFreshPendingStartRequest[\s\S]*isConfirmationSuperseded[\s\S]*matchesLifecycleSnapshot/,
  'Handshake policy must own ordered timestamps, pending/skew, stop-wins confirmation and lifecycle-snapshot equality.',
);
for (const method of [
  'lifecycleTimestampAdvancesStrictlyBeyondKnownBoundary',
  'freshPendingStartUsesBoundedConfirmationWindow',
  'clockRollbackCannotHoldPendingStartForever',
  'terminalStopSupersedesDelayedConfirmation',
  'unconfirmedBoundaryIsSeparateFromConfirmedOrStoppedState',
  'autoRecoverySnapshotMatchesOnlyUnchangedLifecycleTruth',
]) {
  requirePattern('startPolicyTest', new RegExp(`void\\s+${method}\\s*\\(`), `Missing JUnit ${method}.`);
}

requirePattern(
  'configStore',
  /CONFIG_GENERATION_KEY[\s\S]*START_REQUEST_CONFIG_GENERATION_KEY[\s\S]*commitConfig[\s\S]*\.commit\(\)[\s\S]*matchesCurrentGeneration[\s\S]*isCurrentRequestGeneration/,
  'Start handshake must remain backed by durable current/request config generations.',
);
forbidText('configStore', '.apply()', 'Start-critical config durability must never use SharedPreferences.apply().');

requirePattern(
  'plugin',
  /startProtectionService\(PluginCall call\)[\s\S]*requireLifecycleSnapshot[\s\S]*expectedLastStartRequestAt[\s\S]*expectedLastStartAt[\s\S]*expectedLastStopAt[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*synchronized \(EVENT_LOCK\)[\s\S]*matchesLifecycleSnapshot[\s\S]*call\.resolve\(\);[\s\S]*return;[\s\S]*matchesCurrentGeneration\(context, expectedConfigGeneration\)[\s\S]*recordProtectionStartRequested\(context, expectedConfigGeneration\)[\s\S]*startForegroundService\(intent\)/,
  'Automatic restart snapshot must be checked under Dispatch→Event lock before config validation, request persistence or Android dispatch.',
);
requirePattern(
  'plugin',
  /getNonNegativeLongOption[\s\S]*value instanceof Number[\s\S]*Double\.isNaN[\s\S]*Double\.isInfinite[\s\S]*numericValue < 0D/,
  'Native automatic-restart timestamps must reject malformed, non-finite or negative values.',
);
requirePattern(
  'plugin',
  /recordProtectionStartRequested\(Context context, String expectedConfigGeneration\)[\s\S]*expected\.equals\(current\)[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, true\)[\s\S]*LAST_START_REQUEST_AT_KEY[\s\S]*START_REQUEST_CONFIG_GENERATION_KEY[\s\S]*\.commit\(\)/,
  'Activation, request time and exact config generation must remain one durable start-request commit.',
);
requirePattern(
  'plugin',
  /recordProtectionServiceStarted\(Context context\)[\s\S]*isConfirmationSuperseded[\s\S]*SUPERSEDED_BY_STOP[\s\S]*isCurrentRequestGeneration[\s\S]*FAILED_CLOSED[\s\S]*LAST_START_AT_KEY[\s\S]*CONFIRMED/,
  'Foreground confirmation must preserve newer stops and require the current request/config generation.',
);
requirePattern(
  'plugin',
  /stopProtectionService\(PluginCall call\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*persistProtectionTerminalStopWithFallback[\s\S]*dispatchControlledStop/,
  'Manual stop evidence and Android stop dispatch must stay serialized against starts.',
);
forbidText('service', 'stopSelf()', 'Controlled service shutdown must not bypass the shared dispatch guard.');

requirePattern(
  'dispatchGuard',
  /static final Object LOCK[\s\S]*CONTROLLED_STOP_DESTROY_WINDOW_NANOS\s*=\s*30_000_000_000L[\s\S]*dispatchControlledStop[\s\S]*System\.nanoTime/,
  'Controlled stop dispatch must retain bounded one-shot destroy suppression.',
);
requirePattern(
  'dispatchGuardTest',
  /successfulControlledStopIsConsumedExactlyOnceByPromptDestroy[\s\S]*staleControlledStopTokenCannotSuppressLaterUnexpectedDestroy[\s\S]*failedStopDispatchDoesNotSuppressFutureUnexpectedDestroy/,
  'Dispatch guard JUnit must retain prompt/stale/failed-stop coverage.',
);
requirePattern(
  'boot',
  /synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*startForegroundService\(serviceIntent\)/,
  'Boot/update recovery must retain serialized durable start request before Android dispatch.',
);

requirePattern(
  'service',
  /onCreate\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*startForeground\(NOTIFICATION_ID, createNotification\(\)\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*RUNNING\.set\(true\)/,
  'Service must become RUNNING only after foreground creation and durable confirmation.',
);
requirePattern(
  'service',
  /EXTRA_STOP_START_REQUEST_AT[\s\S]*putExtra\(EXTRA_STOP_START_REQUEST_AT, serviceStartRequestAtOnCreate\)[\s\S]*FLAG_UPDATE_CURRENT \| PendingIntent\.FLAG_IMMUTABLE/,
  'Notification stop action must remain bound to lifecycle generation.',
);
requirePattern(
  'lifecyclePolicy',
  /isCurrentNotificationStopGeneration[\s\S]*actionStartRequestAt == serviceStartRequestAt[\s\S]*actionStartRequestAt == latestStartRequestAt/,
  'Stale notification stop actions must not stop a newer lifecycle generation.',
);
requirePattern('lifecyclePolicyTest', /notificationStopIsAcceptedOnlyForCurrentLifecycleGeneration/, 'Missing notification-generation JUnit.');
requirePattern('dispatchSpec', /DISPATCH-05/, 'Dispatch spec must retain stale-notification race evidence.');

requirePattern(
  'bridge',
  /syncCommitted\([\s\S]*startCommitted\([\s\S]*requireLifecycleSnapshot[\s\S]*expectedLastStartRequestAt[\s\S]*expectedLastStartAt[\s\S]*expectedLastStopAt/,
  'TypeScript bridge must expose committed generation reuse and optional lifecycle-snapshot start.',
);
requirePattern(
  'bridge',
  /recoverAfterProcessLoss\([\s\S]*const before = await this\.getStatus\(\)[\s\S]*this\.syncCommitted[\s\S]*this\.startCommitted\(synced\.configGeneration, before\)/,
  'Process-loss recovery must bind automatic restart to the lifecycle snapshot used for the recovery decision.',
);
requirePattern(
  'preparedStartTest',
  /starts an already committed generation without performing a second config sync[\s\S]*forwards a lifecycle snapshot for conditional automatic restart[\s\S]*requireLifecycleSnapshot: true[\s\S]*fails closed before Android dispatch when automatic restart snapshot is invalid/,
  'Prepared-start Vitest must cover single-sync reuse, snapshot forwarding and invalid-snapshot fail-closed behavior.',
);
requirePattern(
  'bridgeTest',
  /const expectedRecoveryStart = \{[\s\S]*expectedConfigGeneration: CONFIG_GENERATION[\s\S]*requireLifecycleSnapshot: true[\s\S]*expectedLastStartRequestAt: 150[\s\S]*expectedLastStartAt: 200[\s\S]*expectedLastStopAt: 100[\s\S]*recovers only from a confirmed unclean process stop[\s\S]*toHaveBeenCalledWith\(expectedRecoveryStart\)/,
  'Process-loss Vitest must lock the shared exact lifecycle snapshot fixture used by automatic recovery.',
);
requirePattern(
  'app',
  /NativeProtection\.getStatus\(\)[\s\S]*start-pending[\s\S]*NativeProtection\.syncCommitted\([\s\S]*shouldRecoverStaleProtection[\s\S]*NativeProtection\.startCommitted\(synced\.configGeneration, serviceStatus\)/,
  'App-open stale recovery must reuse one durable generation and pass the exact decision snapshot.',
);
requirePattern(
  'appTest',
  /single durable generation and exact lifecycle snapshot[\s\S]*startCommittedMock[\s\S]*lastStartRequestAt: 0[\s\S]*lastStartAt: 1[\s\S]*lastStopAt: 0/,
  'App integration test must lock exact stale-recovery snapshot forwarding.',
);

requirePattern('health', /case 'start-pending':[\s\S]*case 'start-interrupted':[\s\S]*case 'unclean-process-stop'/, 'User presentation must keep pending/interrupted/process-loss states distinct.');
requirePattern('statusPanel', /startPending = status\?\.health === 'start-pending'[\s\S]*startRetry = status\?\.health === 'start-interrupted'/, 'Status panel must keep pending duplicate suppression separate from retry.');

for (const method of [
  'startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence',
  'terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite',
  'restartRequestAdvancesBeyondLatestStopBoundary',
]) {
  requirePattern('instrumentation', new RegExp(`void\\s+${method}\\s*\\(`), `Android lifecycle instrumentation is missing ${method}.`);
}
for (const method of [
  'durableConfigGenerationBindsStartRequestAndConfirmation',
  'staleConfigGenerationCannotCreateStartRequest',
  'configChangeBeforeConfirmationFailsClosedWithoutConfirmingOldRequest',
]) {
  requirePattern('configInstrumentation', new RegExp(`void\\s+${method}\\s*\\(`), `Config instrumentation is missing ${method}.`);
}
requirePattern('startSpec', /lastStartRequestAt[\s\S]*lastStartAt[\s\S]*lastStopAt/, 'Start-handshake spec must document lifecycle evidence boundaries.');

if (findings.length > 0) {
  console.log('Start handshake check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Start handshake check passed. Durable generation reuse, lifecycle-snapshot automatic restart, stop-wins ordering, notification generation and foreground confirmation remain source-guarded.',
);