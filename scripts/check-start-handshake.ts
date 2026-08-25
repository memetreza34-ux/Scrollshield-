import { readFile } from 'node:fs/promises';

const javaRoot = 'android/app/src/main/java/app/scrollshield/mobile';
const javaTestRoot = 'android/app/src/test/java/app/scrollshield/mobile';

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
  diagnostics: `${javaRoot}/ScrollShieldDiagnosticsPlugin.java`,
  bridge: 'src/lib/nativeProtection.ts',
  bridgeTest: 'src/lib/nativeProtection.test.ts',
  clockTest: 'src/lib/nativeProtection.clock.test.ts',
  diagnosticsBridge: 'src/lib/nativeDiagnostics.ts',
  health: 'src/lib/nativeProtectionHealth.ts',
  healthTest: 'src/lib/nativeProtectionHealth.test.ts',
  statusPanel: 'src/components/NativeProtectionStatusPanel.tsx',
  statusPanelTest: 'src/components/NativeProtectionStatusPanel.test.tsx',
  instrumentation:
    'android/app/src/androidTest/java/app/scrollshield/mobile/ProtectionDiagnosticsInstrumentedTest.java',
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
  'Native handshake policy must own grace/skew, ordered lifecycle timestamps, pending detection and stop-wins confirmation.',
);
requirePattern(
  'startPolicy',
  /boundary == Long\.MAX_VALUE[\s\S]*boundary \+ 1L[\s\S]*Math\.max\(Math\.max\(0L, now\), nextAfterBoundary\)/,
  'Lifecycle timestamps must advance strictly beyond known request/start/stop evidence when possible.',
);
requirePattern(
  'startPolicy',
  /now < lastStartRequestAt[\s\S]*futureSkew[\s\S]*MAX_FUTURE_CLOCK_SKEW_MS[\s\S]*now - lastStartRequestAt <= CONFIRMATION_GRACE_MS/,
  'Material wall-clock rollback must not keep an old request pending indefinitely.',
);
for (const method of [
  'lifecycleTimestampAdvancesStrictlyBeyondKnownBoundary',
  'freshPendingStartUsesBoundedConfirmationWindow',
  'clockRollbackCannotHoldPendingStartForever',
  'terminalStopSupersedesDelayedConfirmation',
  'unconfirmedBoundaryIsSeparateFromConfirmedOrStoppedState',
]) {
  requirePattern(
    'startPolicyTest',
    new RegExp(`void\\s+${method}\\s*\\(`),
    `Start-handshake JUnit is missing ${method}.`,
  );
}

requirePattern(
  'plugin',
  /LAST_START_REQUEST_AT_KEY\s*=\s*"protection_last_start_request_at"/,
  'Native persistence must keep a dedicated start-request timestamp.',
);
requirePattern(
  'plugin',
  /ProtectionStartConfirmationResult[\s\S]*CONFIRMED[\s\S]*SUPERSEDED_BY_STOP[\s\S]*FAILED_CLOSED/,
  'Confirmed-start persistence must distinguish success, a newer stop winner, and fail-closed persistence failure.',
);
requirePattern(
  'plugin',
  /recordProtectionStartRequested\(Context context\)[\s\S]*requestAt = nextLifecycleTimestamp\(preferences\)[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, true\)[\s\S]*putLong\(LAST_START_REQUEST_AT_KEY, requestAt\)[\s\S]*\.commit\(\)/,
  'Activation intent and ordered request evidence must be one durable commit.',
);
requirePattern(
  'plugin',
  /recordProtectionServiceStarted\(Context context\)[\s\S]*isConfirmationSuperseded\(enabled, requestAt, stopAt\)[\s\S]*SUPERSEDED_BY_STOP[\s\S]*requestAt <= 0L[\s\S]*START_FAILED[\s\S]*FAILED_CLOSED[\s\S]*putLong\(LAST_START_AT_KEY, nextLifecycleTimestamp\(preferences\)\)[\s\S]*CONFIRMED/,
  'Delayed confirmation must preserve a newer stop and only current requests may create ordered confirmed-start evidence.',
);

requirePattern(
  'dispatchGuard',
  /static final Object LOCK[\s\S]*CONTROLLED_STOP_DESTROY_WINDOW_NANOS\s*=\s*30_000_000_000L[\s\S]*dispatchControlledStop\(Context context\)[\s\S]*context\.stopService[\s\S]*System\.nanoTime\(\)/,
  'A single dispatch guard must serialize Android start/stop dispatch and bound residual controlled-destroy suppression.',
);
requirePattern(
  'dispatchGuard',
  /consumeControlledStopDestroy\(long nowNanos\)[\s\S]*ageNanos >= 0L[\s\S]*ageNanos <= CONTROLLED_STOP_DESTROY_WINDOW_NANOS[\s\S]*controlledStopAwaitingDestroy = false/,
  'Controlled-stop destroy evidence must be monotonic, bounded and one-shot.',
);
requirePattern(
  'dispatchGuardTest',
  /successfulControlledStopIsConsumedExactlyOnceByPromptDestroy[\s\S]*staleControlledStopTokenCannotSuppressLaterUnexpectedDestroy[\s\S]*backwardMonotonicInputFailsSafeInsteadOfSuppressingDestroy[\s\S]*failedStopDispatchDoesNotSuppressFutureUnexpectedDestroy/,
  'Dispatch-guard JUnit must cover prompt, stale, backwards-time and failed-dispatch boundaries.',
);

requirePattern(
  'plugin',
  /startProtectionService\(PluginCall call\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*ScrollShieldProtectionService\.isRunning\(\) && isProtectionEnabled\(context\)[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*startForegroundService\(intent\)/,
  'App start must hold the dispatch lock from active/pending checks through request persistence and Android dispatch.',
);
const nativeStartStart = source.plugin.indexOf('public void startProtectionService');
const rejectStart = source.plugin.indexOf('private static void rejectProtectionStartPrerequisite', nativeStartStart + 1);
if (nativeStartStart < 0 || rejectStart <= nativeStartStart) {
  findings.push(`${paths.plugin}: Could not isolate startProtectionService.`);
} else if (source.plugin.slice(nativeStartStart, rejectStart).includes('setProtectionEnabled(context, true)')) {
  findings.push(`${paths.plugin}: App start must not restore a standalone enabled=true write.`);
}
requirePattern(
  'plugin',
  /stopProtectionService\(PluginCall call\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*persistProtectionTerminalStopWithFallback[\s\S]*dispatchControlledStop\(context\)/,
  'App stop persistence and Android stop dispatch must be serialized against starts.',
);
forbidText(
  'plugin',
  'context.stopService(new Intent(context, ScrollShieldProtectionService.class))',
  'Plugin lifecycle callers must use the shared dispatch guard instead of a direct stopService call.',
);

requirePattern(
  'boot',
  /synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*ScrollShieldProtectionService\.isRunning\(\)[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*startForegroundService\(serviceIntent\)/,
  'Boot/app-update recovery must use the same serialized request-to-dispatch handshake.',
);
requirePattern(
  'boot',
  /stopRecoveryLocked[\s\S]*persistProtectionSystemStopWithFallback[\s\S]*dispatchControlledStop\(context\)/,
  'Recovery failures must serialize fail-closed evidence with Android stop dispatch.',
);

requirePattern(
  'service',
  /onCreate\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*serviceStartRequestAtOnCreate = ScrollShieldNativePlugin\.getLastProtectionStartRequestAt\(this\)[\s\S]*startForeground\(NOTIFICATION_ID, createNotification\(\)\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*confirmation != ScrollShieldNativePlugin\.ProtectionStartConfirmationResult\.CONFIRMED[\s\S]*dispatchControlledStop\(this\)[\s\S]*RUNNING\.set\(true\)/,
  'Service creation must serialize request ownership, foreground creation, durable confirmation and fail-closed shutdown before RUNNING=true.',
);
requirePattern(
  'service',
  /onStartCommand[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*hasUnconfirmedProtectionStartRequest\(this\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*confirmation != ScrollShieldNativePlugin\.ProtectionStartConfirmationResult\.CONFIRMED[\s\S]*serviceStartRequestAtOnCreate = ScrollShieldNativePlugin\.getLastProtectionStartRequestAt\(this\)/,
  'A still-living service must confirm and adopt a newer restart request generation.',
);
forbidText(
  'service',
  'stopSelf()',
  'Controlled shutdown must not bypass serialized stopService dispatch with stopSelf().',
);
requirePattern(
  'service',
  /onDestroy\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*RUNNING\.set\(false\)[\s\S]*consumeControlledStopDestroy\(\)[\s\S]*if \(!controlledDispatchDestroy\)[\s\S]*shouldRecordUnexpectedDestroy[\s\S]*UNEXPECTED_SERVICE_DESTROY_CODE/,
  'onDestroy must publish the dying state before concurrent restarts, consume only prompt controlled destroys, then classify real unexpected destruction.',
);

requirePattern(
  'lifecyclePolicy',
  /terminalStopAfterThisServiceWasRequested[\s\S]*lastStopAt >= serviceStartRequestAtOnCreate[\s\S]*hasUnconfirmedStartRequest/,
  'Old service destruction must not overwrite a newer stop/restart generation or a pre-confirmation interruption.',
);
requirePattern(
  'lifecyclePolicyTest',
  /doesNotLetOldServiceDestroyOverwriteFastRestart[\s\S]*transferredRestartOwnershipRestoresUnexpectedDestroyDetection[\s\S]*preConfirmationDestroyRemainsStartInterruptedNotUnexpectedDestroy/,
  'Lifecycle JUnit must lock old-generation suppression, restart ownership transfer and pre-confirmation destruction.',
);

requirePattern(
  'diagnostics',
  /lastProtectionStartRequestAt[\s\S]*getLastProtectionStartRequestAt\(context\)[\s\S]*lastProtectionStartAt/,
  'Native diagnostics must export request evidence separately from confirmed-start evidence.',
);
requirePattern(
  'diagnosticsBridge',
  /lastProtectionStartRequestAt:\s*number[\s\S]*lastProtectionStartAt:\s*number/,
  'TypeScript diagnostics must type request and confirmed-start evidence separately.',
);

requirePattern(
  'bridge',
  /NativeProtectionHealth[\s\S]*'start-pending'[\s\S]*'start-interrupted'[\s\S]*'unclean-process-stop'/,
  'TypeScript health must distinguish pending start, interrupted start and confirmed process loss.',
);
requirePattern(
  'bridge',
  /START_CONFIRMATION_GRACE_MS\s*=\s*15_000[\s\S]*MAX_FUTURE_CLOCK_SKEW_MS\s*=\s*5_000/,
  'TypeScript and native handshake must keep matching grace/skew constants.',
);
requirePattern(
  'bridge',
  /latestConfirmedBoundary = Math\.max\(status\.lastStartAt, status\.lastStopAt\)[\s\S]*lastStartRequestAt > latestConfirmedBoundary[\s\S]*futureClockSkewMs[\s\S]*MAX_FUTURE_CLOCK_SKEW_MS[\s\S]*return 'start-interrupted'[\s\S]*START_CONFIRMATION_GRACE_MS[\s\S]*return 'unclean-process-stop'/,
  'Health classification must resolve unconfirmed request/clock-skew boundaries before confirmed process-loss logic.',
);
requirePattern(
  'bridgeTest',
  /detects a pending start request during the confirmation grace window[\s\S]*detects an interrupted start request after the confirmation grace window[\s\S]*unclean process stop/,
  'Vitest must cover pending, interrupted and confirmed process-loss states.',
);
requirePattern(
  'clockTest',
  /tolerates only a small future skew for a fresh pending request[\s\S]*start-pending[\s\S]*fails out of pending when the wall clock moved materially backward[\s\S]*start-interrupted/,
  'Clock-skew Vitest must prove a material rollback cannot hold start-pending forever.',
);

requirePattern(
  'health',
  /case 'start-pending':[\s\S]*STARTET[\s\S]*case 'start-interrupted':[\s\S]*START ABGEBROCHEN[\s\S]*case 'unclean-process-stop':[\s\S]*PROZESS ABGEBROCHEN/,
  'Presentation must keep pending, interrupted and process-loss states visually distinct.',
);
requirePattern(
  'healthTest',
  /shows a neutral in-flight state while Android can still confirm a fresh start request[\s\S]*explains an interrupted start separately from a confirmed process loss/,
  'Presentation tests must cover pending and interrupted starts.',
);
requirePattern(
  'statusPanel',
  /startPending = status\?\.health === 'start-pending'[\s\S]*Start wird bestätigt[\s\S]*startRetry = status\?\.health === 'start-interrupted'[\s\S]*Schutz erneut starten/,
  'Status panel must suppress duplicate pending starts and offer a normal retry after interruption.',
);
requirePattern(
  'statusPanelTest',
  /blocks duplicate starts while a fresh start request is awaiting confirmation[\s\S]*offers a normal retry after an unconfirmed start was interrupted/,
  'Status-panel tests must cover duplicate suppression and retry semantics.',
);

for (const method of [
  'startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence',
  'terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite',
  'restartRequestAdvancesBeyondLatestStopBoundary',
]) {
  requirePattern(
    'instrumentation',
    new RegExp(`void\\s+${method}\\s*\\(`),
    `Android instrumentation is missing ${method}.`,
  );
}
requirePattern(
  'instrumentation',
  /terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite[\s\S]*recordProtectionTerminalStop[\s\S]*SUPERSEDED_BY_STOP[\s\S]*getLastProtectionStopCode[\s\S]*getLastProtectionStopMessage[\s\S]*protection_events/,
  'Instrumentation must prove delayed confirmation cannot overwrite terminal stop evidence.',
);
requirePattern(
  'instrumentation',
  /restartRequestAdvancesBeyondLatestStopBoundary[\s\S]*restartRequestAt > stopAt[\s\S]*ProtectionStartConfirmationResult\.CONFIRMED/,
  'Instrumentation must prove immediate restart creates a strictly newer confirmable request generation.',
);

if (findings.length > 0) {
  console.log('Protection start-handshake check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection start-handshake check passed. Ordered durable evidence, serialized app/boot start-stop dispatch, bounded controlled-destroy suppression, restart ownership transfer, clock-skew handling, UI states and Android instrumentation contracts remain guarded.',
);
