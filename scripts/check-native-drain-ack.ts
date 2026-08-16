import { readFile } from 'node:fs/promises';
import path from 'node:path';

type Finding = { file: string; text: string };
const findings: Finding[] = [];

const root = path.join('android', 'app', 'src');
const javaRoot = path.join(root, 'main', 'java', 'app', 'scrollshield', 'mobile');
const androidTestRoot = path.join(root, 'androidTest', 'java', 'app', 'scrollshield', 'mobile');
const storePath = path.join(javaRoot, 'NativeDrainBatchStore.java');
const pluginPath = path.join(javaRoot, 'ScrollShieldNativePlugin.java');
const instrumentedTestPath = path.join(androidTestRoot, 'NativeDrainBatchInstrumentedTest.java');
const bridgePath = path.join('src', 'lib', 'nativeProtection.ts');
const journalPath = path.join('src', 'lib', 'nativeDrainJournal.ts');
const journalTestPath = path.join('src', 'lib', 'nativeDrainJournal.test.ts');
const appPath = path.join('src', 'App.tsx');

const [store, plugin, instrumentedTest, bridge, journal, journalTest, app] = await Promise.all([
  readFile(storePath, 'utf8'),
  readFile(pluginPath, 'utf8'),
  readFile(instrumentedTestPath, 'utf8'),
  readFile(bridgePath, 'utf8'),
  readFile(journalPath, 'utf8'),
  readFile(journalTestPath, 'utf8'),
  readFile(appPath, 'utf8'),
]);

const requireMatch = (file: string, content: string, pattern: RegExp, text: string) => {
  if (!pattern.test(content)) findings.push({ file, text });
};

requireMatch(
  storePath,
  store,
  /PENDING_BATCH_KEY\s*=\s*"pending_protection_drain_v1"/,
  'Native drain payload must remain durable in a dedicated pending-batch key.',
);
requireMatch(
  storePath,
  store,
  /putString\(PENDING_BATCH_KEY,[\s\S]*putString\(EVENT_QUEUE_KEY, "\[\]"\)[\s\S]*commit\(\)/,
  'Moving events out of the live queue must persist the pending batch in the same commit.',
);
requireMatch(
  storePath,
  store,
  /acknowledge\([\s\S]*pendingBatchId[\s\S]*usageCursors[\s\S]*EXPORTED_USAGE_PREFIX[\s\S]*remove\(PENDING_BATCH_KEY\)[\s\S]*commit\(\)/,
  'Usage cursors and pending-batch removal must happen only during matching ACK.',
);
requireMatch(
  storePath,
  store,
  /current < snapshot \|\| exported > snapshot/,
  'ACK must fail closed when native usage counters move backwards or cursors are inconsistent.',
);

requireMatch(
  pluginPath,
  plugin,
  /drainProtectionEvents[\s\S]*NativeDrainBatchStore\.getOrCreate/,
  'Capacitor drain must use the persistent native batch store.',
);
requireMatch(
  pluginPath,
  plugin,
  /acknowledgeProtectionEvents[\s\S]*NativeDrainBatchStore\.acknowledge/,
  'Capacitor bridge must expose explicit batch acknowledgement.',
);

requireMatch(
  bridgePath,
  bridge,
  /NativeProtectionDrain[\s\S]*batchId:\s*string/,
  'TypeScript drain payload must carry a batch id.',
);
requireMatch(
  bridgePath,
  bridge,
  /acknowledgeDrain\([\s\S]*acknowledgeProtectionEvents/,
  'TypeScript bridge must expose native drain acknowledgement.',
);
requireMatch(
  bridgePath,
  bridge,
  /events\.length > 0 \|\| usage\.length > 0[\s\S]*!batchId[\s\S]*throw new Error/,
  'Payload data without a valid native batch id must fail closed.',
);

requireMatch(
  journalPath,
  journal,
  /__scrollshieldNativeDrain/,
  'Processed batch id must live inside the transactionally persisted settings chunk.',
);
requireMatch(
  journalPath,
  journal,
  /hasProcessedNativeDrainBatch[\s\S]*return state/,
  'React batch application must be idempotent for a replayed batch id.',
);
requireMatch(
  journalPath,
  journal,
  /metadata:\s*\{ source: 'native_android', nativeDrainBatchId: batchId \}/,
  'Imported native history evidence must retain its batch id.',
);

requireMatch(
  appPath,
  app,
  /StorageService\.saveState\(appState\)[\s\S]*persistedNativeDrainBatchIdRef[\s\S]*acknowledgeDrain/,
  'Normal React persistence must precede ACK of an applied batch.',
);
requireMatch(
  appPath,
  app,
  /persistedNativeDrainBatchIdRef\.current === nativeDrain\.batchId[\s\S]*acknowledgeDrain\(nativeDrain\.batchId\)/,
  'Crash replay of an already persisted batch must ACK without applying it again.',
);
requireMatch(
  appPath,
  app,
  /getLastProcessedNativeDrainBatchId\(currentState\) === nativeDrain\.batchId[\s\S]*StorageService\.saveState\(currentState\)/,
  'A failed in-process save must be retried before ACK.',
);

for (const [method, description] of [
  ['pendingBatchReplaysExactlyUntilMatchingAck', 'replay until ACK'],
  ['wrongAckCannotAdvanceUsageOrRemovePendingBatch', 'wrong-ACK rejection'],
  ['eventsCreatedAfterBatchStayQueuedWhenOldBatchIsAcknowledged', 'new-event preservation'],
  ['usageAccumulatedWhilePendingBecomesNextDeltaAfterAck', 'usage after pending snapshot'],
  ['acknowledgeIsIdempotentAfterSuccessfulRemoval', 'idempotent ACK'],
]) {
  requireMatch(
    instrumentedTestPath,
    instrumentedTest,
    new RegExp(`void\\s+${method}\\s*\\(`),
    `Android instrumentation must cover ${description}.`,
  );
}

requireMatch(
  journalTestPath,
  journalTest,
  /applies usage and events exactly once for the same persistent batch id/,
  'Vitest must protect React-side batch idempotency.',
);
requireMatch(
  journalTestPath,
  journalTest,
  /keeps the processed id through normal state normalization/,
  'Vitest must prove the journal survives state persistence/normalization shape.',
);

if (findings.length > 0) {
  console.log('Native drain ACK contract check failed:\n');
  for (const finding of findings) console.log(`- ${finding.file}: ${finding.text}`);
  process.exit(1);
}

console.log('Native drain ACK contract check passed. Persistent batch, transactional journal, and ACK guards are present.');
