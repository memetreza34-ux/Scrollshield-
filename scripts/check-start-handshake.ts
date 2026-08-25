import { readFile } from 'node:fs/promises';

const javaRoot = 'android/app/src/main/java/app/scrollshield/mobile';
const pluginPath = `${javaRoot}/ScrollShieldNativePlugin.java`;
const servicePath = `${javaRoot}/ScrollShieldProtectionService.java`;
const bridgePath = 'src/lib/nativeProtection.ts';
const bridgeTestPath = 'src/lib/nativeProtection.test.ts';
const healthPath = 'src/lib/nativeProtectionHealth.ts';
const healthTestPath = 'src/lib/nativeProtectionHealth.test.ts';
const statusPanelPath = 'src/components/NativeProtectionStatusPanel.tsx';
const statusPanelTestPath = 'src/components/NativeProtectionStatusPanel.test.tsx';
const instrumentationPath =
  'android/app/src/androidTest/java/app/scrollshield/mobile/ProtectionDiagnosticsInstrumentedTest.java';

const [plugin, service, bridge, bridgeTest, health, healthTest, statusPanel, statusPanelTest, instrumentation] =
  await Promise.all([
    readFile(pluginPath, 'utf8'),
    readFile(servicePath, 'utf8'),
    readFile(bridgePath, 'utf8'),
    readFile(bridgeTestPath, 'utf8'),
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
  pluginPath,
  plugin,
  /LAST_START_REQUEST_AT_KEY\s*=\s*"protection_last_start_request_at"/,
  'Native persistence must keep a dedicated start-request timestamp.',
);
requirePattern(
  pluginPath,
  plugin,
  /recordProtectionStartRequested\(Context context\)[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, true\)[\s\S]*putLong\(LAST_START_REQUEST_AT_KEY, System\.currentTimeMillis\(\)\)[\s\S]*\.commit\(\)/,
  'Activation intent and start-request timestamp must be persisted atomically.',
);
requirePattern(
  pluginPath,
  plugin,
  /startProtectionService\(PluginCall call\)[\s\S]*ScrollShieldProtectionService\.isRunning\(\) && isProtectionEnabled\(context\)[\s\S]*recordProtectionStartRequested\(context\)[\s\S]*startForegroundService\(intent\)/,
  'Native start must be idempotent for an already-active service and persist the request before requesting the foreground service.',
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
  /recordProtectionServiceStarted\(Context context\)[\s\S]*putLong\(LAST_START_AT_KEY, System\.currentTimeMillis\(\)\)[\s\S]*boolean persisted[\s\S]*if \(!persisted\)[\s\S]*persistProtectionSystemStopWithFallback\([\s\S]*ProtectionStopReasonPolicy\.START_FAILED[\s\S]*throw new IllegalStateException/,
  'Confirmed-start evidence must fail closed with START_FAILED if its durable commit fails.',
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
  /startForeground\(NOTIFICATION_ID, createNotification\(\)\)[\s\S]*recordProtectionServiceStarted\(this\)[\s\S]*RUNNING\.set\(true\)/,
  'RUNNING=true must remain after successful foreground creation and durable confirmed-start evidence.',
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
  'Fresh start requests need a bounded confirmation grace window.',
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

requirePattern(
  instrumentationPath,
  instrumentation,
  /startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence[\s\S]*recordProtectionStartRequested[\s\S]*getLastProtectionStartRequestAt[\s\S]*assertEquals\(0L, ScrollShieldNativePlugin\.getLastProtectionStartAt[\s\S]*recordProtectionServiceStarted[\s\S]*confirmedStartAt >= requestAt/,
  'Android instrumentation must prove request evidence exists before confirmed-start evidence.',
);

if (findings.length > 0) {
  console.log('Protection start-handshake check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection start-handshake check passed. Activation intent, pending confirmation, interrupted pre-start, confirmed service start, and later process loss remain distinct source contracts.',
);
