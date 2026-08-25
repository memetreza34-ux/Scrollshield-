import { readFile } from 'node:fs/promises';

const javaRoot = 'android/app/src/main/java/app/scrollshield/mobile';
const javaTestRoot = 'android/app/src/test/java/app/scrollshield/mobile';
const pluginPath = `${javaRoot}/ScrollShieldNativePlugin.java`;
const servicePath = `${javaRoot}/ScrollShieldProtectionService.java`;
const bootReceiverPath = `${javaRoot}/ScrollShieldBootReceiver.java`;
const diagnosticsPath = `${javaRoot}/ScrollShieldDiagnosticsPlugin.java`;
const handshakePolicyPath = `${javaRoot}/ProtectionStartHandshakePolicy.java`;
const handshakePolicyTestPath = `${javaTestRoot}/ProtectionStartHandshakePolicyTest.java`;
const lifecyclePolicyPath = `${javaRoot}/ProtectionServiceLifecyclePolicy.java`;
const lifecyclePolicyTestPath = `${javaTestRoot}/ProtectionServiceLifecyclePolicyTest.java`;
const bridgePath = 'src/lib/nativeProtection.ts';
const bridgeTestPath = 'src/lib/nativeProtection.test.ts';
const diagnosticsBridgePath = 'src/lib/nativeDiagnostics.ts';
const healthPath = 'src/lib/nativeProtectionHealth.ts';
const healthTestPath = 'src/lib/nativeProtectionHealth.test.ts';
const statusPanelPath = 'src/components/NativeProtectionStatusPanel.tsx';
const statusPanelTestPath = 'src/components/NativeProtectionStatusPanel.test.tsx';
const instrumentationPath =
  'android/app/src/androidTest/java/app/scrollshield/mobile/ProtectionDiagnosticsInstrumentedTest.java';

const [
  plugin,
  service,
  bootReceiver,
  diagnostics,
  handshakePolicy,
  handshakePolicyTest,
  lifecyclePolicy,
  lifecyclePolicyTest,
  bridge,
  bridgeTest,
  diagnosticsBridge,
  health,
  healthTest,
  statusPanel,
  statusPanelTest,
  instrumentation,
] = await Promise.all([
  readFile(pluginPath, 'utf8'),
  readFile(servicePath, 'utf8'),
  readFile(bootReceiverPath, 'utf8'),
  readFile(diagnosticsPath, 'utf8'),
  readFile(handshakePolicyPath, 'utf8'),
  readFile(handshakePolicyTestPath, 'utf8'),
  readFile(lifecyclePolicyPath, 'utf8'),
  readFile(lifecyclePolicyTestPath, 'utf8'),
  readFile(bridgePath, 'utf8'),
  readFile(bridgeTestPath, 'utf8'),
  readFile(diagnosticsBridgePath, 'utf8'),
  readFile(healthPath, 'utf8'),
  readFile(healthTestPath, 'utf8'),
  readFile(statusPanelPath, 'utf8'),
  readFile(statusPanelTestPath, 'utf8'),
  readFile(instrumentationPath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
}

requirePattern(
  handshakePolicyPath,
  handshakePolicy,
  /CONFIRMATION_GRACE_MS\s*=\s*15_000L[\s\S]*nextLifecycleTimestamp[\s\S]*hasUnconfirmedStartRequest[\s\S]*hasFreshPendingStartRequest[\s\S]*isConfirmationSuperseded/,
  'Native start-handshake policy must own the grace window, strict lifecycle ordering, pending detection, and stop-wins confirmation boundary.',
);
requirePattern(
  handshakePolicyPath,
  handshakePolicy,
  /boundary == Long\.MAX_VALUE[\s\S]*boundary \+ 1L[\s\S]*Math\.max\(Math\.max\(0L, now\), nextAfterBoundary\)/,
  'Lifecycle timestamps must advance strictly beyond the latest known boundary when possible.',
);
for (const method of [
  'lifecycleTimestampAdvancesStrictlyBeyondKnownBoundary',
  'freshPendingStartUsesBoundedConfirmationWindow',
  'terminalStopSupersedesDelayedConfirmation',
  'unconfirmedBoundaryIsSeparateFromConfirmedOrStoppedState',
]) {
  requirePattern(
    handshakePolicyTestPath,
    handshakePolicyTest,
    new RegExp(`void\\s+${method}\\s*\\(`),
    `Start-handshake JUnit coverage is missing ${method}.`,
  );
}

requirePattern(
  pluginPath,
  plugin,
  /LAST_START_REQUEST_AT_KEY\s*=\s*"protection_last_start_request_at"/,
  'Native persistence must keep a dedicated start-request timestamp.',
);
requirePattern(
  pluginPath,
  plugin,
  /ProtectionStartConfirmationResult[\s\S]*CONFIRMED[\s\S]*SUPERSEDED_BY_STOP[\s\S]*FAILED_CLOSED/,
  'Native confirmation must distinguish success, a newer stop winner, and fail-closed persistence failure.',
);
requirePattern(
  pluginPath,
  plugin,
  /recordProtectionStartRequested\(Context context\)[\s\S]*requestAt = nextLifecycleTimestamp\(preferences\)[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, true\)[\s\S]*putLong\(LAST_START_REQUEST_AT_KEY, requestAt\)[\s\S]*\.commit\(\)/,
  'Activation intent and a strictly ordered start-request timestamp must be persisted atomically.',
);
requirePattern(
  pluginPath,
  plugin,
  /hasFreshProtectionStartRequest\(Context context\)[\s\S]*hasFreshPendingStartRequest[\s\S]*System\.currentTimeMillis\(\)/,
  'Native code must expose a read-only fresh-pending guard for duplicate start suppression.',
);
requirePattern(
  pluginPath,
  plugin,
  /startProtectionService\(PluginCall call\)[\s\S]*ScrollShieldProtectionService\.isRunning\(\) && isProtectionEnabled\(context\)[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*startForegroundService\(intent\)/,
  'Native start must be idempotent for active and fresh-pending states before creating a new request generation.',
);
const nativeStartStart = plugin.indexOf('public void startProtectionService');
const prerequisiteRejectStart = plugin.indexOf('private static void rejectProtectionStartPrerequisite', nativeStartStart + 1);
if (nativeStartStart < 0 || prerequisiteRejectStart <= nativeStartStart) {
  findings.push(`${pluginPath}: Could not isolate startProtectionService.`);
} else {
  const body = plugin.slice(nativeStartStart, prerequisiteRejectStart);
  if (body.includes('setProtectionEnabled(context, true)')) {
    findings.push(
      `${pluginPath}: startProtectionService must not restore a standalone enabled=true write; use recordProtectionStartRequested.`,
    );
  }
}
requirePattern(
  pluginPath,
  plugin,
  /recordProtectionServiceStarted\(Context context\)[\s\S]*isConfirmationSuperseded\(enabled, requestAt, stopAt\)[\s\S]*SUPERSEDED_BY_STOP[\s\S]*requestAt <= 0L[\s\S]*START_FAILED[\s\S]*FAILED_CLOSED[\s\S]*putLong\(LAST_START_AT_KEY, nextLifecycleTimestamp\(preferences\)\)[\s\S]*CONFIRMED/,
  'Delayed confirmation must preserve a newer stop, while real confirmation uses strictly ordered durable start evidence and fails closed on invalid persistence.',
);
requirePattern(
  pluginPath,
  plugin,
  /recordProtectionSystemStop[\s\S]*timestamp = nextLifecycleTimestamp\(preferences\)[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, false\)/,
  'System-stop timestamps must share the strict lifecycle ordering used by start requests.',
);
requirePattern(
  pluginPath,
  plugin,
  /recordProtectionTerminalStop[\s\S]*timestamp = nextLifecycleTimestamp\(preferences\)[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, false\)/,
  'Terminal-stop timestamps must share the strict lifecycle ordering used by start requests.',
);
requirePattern(
  pluginPath,
  plugin,
  /getProtectionServiceStatus[\s\S]*lastStartRequestAt[\s\S]*getLastProtectionStartRequestAt/,
  'Native service status must expose the persisted start-request timestamp.',
);

requirePattern(
  servicePath,
  service,
  /serviceStartRequestAtOnCreate = ScrollShieldNativePlugin\.getLastProtectionStartRequestAt\(this\)[\s\S]*startForeground\(NOTIFICATION_ID, createNotification\(\)\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*confirmation != ScrollShieldNativePlugin\.ProtectionStartConfirmationResult\.CONFIRMED[\s\S]*RUNNING\.set\(false\)[\s\S]*stopSelf\(\)[\s\S]*RUNNING\.set\(true\)/,
  'A new service instance must capture its request generation and refuse RUNNING=true when a newer stop already won confirmation.',
);
requirePattern(
  servicePath,
  service,
  /onStartCommand[\s\S]*hasUnconfirmedProtectionStartRequest\(this\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*confirmation != ScrollShieldNativePlugin\.ProtectionStartConfirmationResult\.CONFIRMED[\s\S]*START_NOT_STICKY/,
  'An already-created service must confirm a newer restart request delivered through onStartCommand.',
);
requirePattern(
  lifecyclePolicyPath,
  lifecyclePolicy,
  /terminalStopAfterThisServiceWasRequested[\s\S]*lastStopAt >= serviceStartRequestAtOnCreate[\s\S]*hasUnconfirmedStartRequest/,
  'Old service destruction must not overwrite a stop/restart generation or a pre-confirmation interruption.',
);
requirePattern(
  lifecyclePolicyTestPath,
  lifecyclePolicyTest,
  /doesNotLetOldServiceDestroyOverwriteFastRestart[\s\S]*preConfirmationDestroyRemainsStartInterruptedNotUnexpectedDestroy/,
  'Lifecycle JUnit tests must lock fast stop-restart and pre-confirmation destroy boundaries.',
);

requirePattern(
  bootReceiverPath,
  bootReceiver,
  /recordProtectionStartRequested\(context\)[\s\S]*recovery_start_failed[\s\S]*return[\s\S]*startForegroundService\(serviceIntent\)/,
  'Boot/app-update recovery must persist a fresh start request before requesting the foreground service.',
);
const bootStartRequestIndex = bootReceiver.indexOf('recordProtectionStartRequested(context)');
const bootServiceStartIndex = bootReceiver.indexOf('context.startForegroundService(serviceIntent)');
if (bootStartRequestIndex < 0 || bootServiceStartIndex <= bootStartRequestIndex) {
  findings.push(
    `${bootReceiverPath}: Boot/app-update recovery must record start-request evidence before startForegroundService.`,
  );
}
requirePattern(
  diagnosticsPath,
  diagnostics,
  /lastProtectionStartRequestAt[\s\S]*getLastProtectionStartRequestAt\(context\)[\s\S]*lastProtectionStartAt/,
  'The native diagnostics snapshot must expose request evidence separately from confirmed-start evidence.',
);
requirePattern(
  diagnosticsBridgePath,
  diagnosticsBridge,
  /lastProtectionStartRequestAt:\s*number[\s\S]*lastProtectionStartAt:\s*number/,
  'TypeScript diagnostics must type the start-request timestamp for device evidence export.',
);

requirePattern(
  bridgePath,
  bridge,
  /NativeProtectionHealth[\s\S]*'start-pending'[\s\S]*'start-interrupted'[\s\S]*'unclean-process-stop'/,
  'TypeScript health must distinguish pending start, interrupted start, and confirmed process loss.',
);
requirePattern(
  bridgePath,
  bridge,
  /START_CONFIRMATION_GRACE_MS\s*=\s*15_000/,
  'TypeScript and native start confirmation must use the same 15-second grace contract.',
);
requirePattern(
  bridgePath,
  bridge,
  /lastStartRequestAt:\s*number[\s\S]*lastStartAt:\s*number/,
  'NativeProtectionStatus must expose start-request and confirmed-start timestamps separately.',
);
requirePattern(
  bridgePath,
  bridge,
  /latestConfirmedBoundary = Math\.max\(status\.lastStartAt, status\.lastStopAt\)[\s\S]*status\.lastStartRequestAt > latestConfirmedBoundary[\s\S]*return requestAgeMs <= START_CONFIRMATION_GRACE_MS \? 'start-pending' : 'start-interrupted'[\s\S]*status\.lastStartAt > 0[\s\S]*return 'unclean-process-stop'/,
  'An unconfirmed newer request must classify before confirmed process-loss logic.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /detects a pending start request during the confirmation grace window[\s\S]*start-pending/,
  'Vitest must cover the fresh start-pending boundary.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /detects an interrupted start request after the confirmation grace window[\s\S]*start-interrupted/,
  'Vitest must cover an unconfirmed start after the grace window.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /lastStartRequestAt:[\s\S]*lastStartAt:[\s\S]*unclean-process-stop/,
  'Process-loss tests must prove confirmed start evidence is newer than its request.',
);

requirePattern(
  healthPath,
  health,
  /case 'start-pending':[\s\S]*STARTET[\s\S]*Startanforderung[\s\S]*showLastStop: false/,
  'The UI must explain a fresh start request without presenting it as a failure.',
);
requirePattern(
  healthPath,
  health,
  /case 'start-interrupted':[\s\S]*START ABGEBROCHEN[\s\S]*Foreground-Bestätigung[\s\S]*showLastStop: false/,
  'The UI must explain an interrupted pre-confirmation start separately from process loss.',
);
requirePattern(
  healthTestPath,
  healthTest,
  /shows a neutral in-flight state while Android can still confirm a fresh start request[\s\S]*STARTET/,
  'Presentation tests must cover start-pending.',
);
requirePattern(
  healthTestPath,
  healthTest,
  /explains an interrupted start separately from a confirmed process loss[\s\S]*START ABGEBROCHEN/,
  'Presentation tests must cover start-interrupted.',
);
requirePattern(
  statusPanelPath,
  statusPanel,
  /startPending = status\?\.health === 'start-pending'[\s\S]*disabled=\{busy \|\| stopActionLocked \|\| startPending\}[\s\S]*Start wird bestätigt/,
  'The status panel must suppress duplicate starts while confirmation is still pending.',
);
requirePattern(
  statusPanelPath,
  statusPanel,
  /startRetry = status\?\.health === 'start-interrupted'[\s\S]*Schutz erneut starten/,
  'An interrupted start must offer a normal retry rather than process-loss recovery.',
);
requirePattern(
  statusPanelTestPath,
  statusPanelTest,
  /blocks duplicate starts while a fresh start request is awaiting confirmation[\s\S]*Start wird bestätigt/,
  'Status-panel tests must cover duplicate-start suppression.',
);
requirePattern(
  statusPanelTestPath,
  statusPanelTest,
  /offers a normal retry after an unconfirmed start was interrupted[\s\S]*Schutz erneut starten/,
  'Status-panel tests must cover interrupted-start retry.',
);

for (const method of [
  'startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence',
  'terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite',
  'restartRequestAdvancesBeyondLatestStopBoundary',
]) {
  requirePattern(
    instrumentationPath,
    instrumentation,
    new RegExp(`void\\s+${method}\\s*\\(`),
    `Android instrumentation must cover ${method}.`,
  );
}
requirePattern(
  instrumentationPath,
  instrumentation,
  /terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite[\s\S]*recordProtectionTerminalStop[\s\S]*SUPERSEDED_BY_STOP[\s\S]*assertEquals\(0L, ScrollShieldNativePlugin\.getLastProtectionStartAt[\s\S]*getLastProtectionStopCode[\s\S]*getLastProtectionStopMessage[\s\S]*protection_events/,
  'Instrumentation must prove a terminal stop wins without delayed confirmation changing start or stop evidence.',
);
requirePattern(
  instrumentationPath,
  instrumentation,
  /restartRequestAdvancesBeyondLatestStopBoundary[\s\S]*restartRequestAt > stopAt[\s\S]*hasFreshProtectionStartRequest[\s\S]*ProtectionStartConfirmationResult\.CONFIRMED/,
  'Instrumentation must prove immediate restart creates a strictly newer request generation that can be confirmed.',
);

if (findings.length > 0) {
  console.log('Protection start-handshake check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection start-handshake check passed. Plugin/boot starts, strict lifecycle ordering, pending duplicate suppression, stop-wins confirmation, fast restart destroy isolation, exported diagnostics, and process-loss separation remain guarded.',
);
