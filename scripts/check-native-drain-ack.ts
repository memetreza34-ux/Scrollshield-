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
const bridgeTestPath = path.join('src', 'lib', 'nativeProtectionDrain.test.ts');
const journalPath = path.join('src', 'lib', 'nativeDrainJournal.ts');
const journalTestPath = path.join('src', 'lib', 'nativeDrainJournal.test.ts');
const appPath = path.join('src', 'App.tsx');

const [store, plugin, instrumentedTest, bridge, bridgeTest, journal, journalTest, app] = await Promise.all([
  readFile(storePath, 'utf8'),
  readFile(pluginPath, 'utf8'),
  readFile(instrumentedTestPath, 'utf8'),
  readFile(bridgePath, 'utf8'),
  readFile(bridgeTestPath, 'utf8'),
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
  storePath,
  store,
  /FACTORY_RESET_PENDING_KEY\s*=\s*"factory_reset_pending_v1"/,
  'Native factory reset must retain a tombstone against late service writes.',
);
requireMatch(
  storePath,
  store,
  /markFactoryReset\([\s\S]*\.clear\(\)[\s\S]*putBoolean\(FACTORY_RESET_PENDING_KEY, true\)[\s\S]*commit\(\)/,
  'Factory reset must clear native preferences and persist the tombstone atomically.',
);
requireMatch(
  storePath,
  store,
  /finalizeFactoryResetIfPending\([\s\S]*getBoolean\(FACTORY_RESET_PENDING_KEY, false\)[\s\S]*String newConfig[\s\S]*preferences\.edit\(\)\.clear\(\)[\s\S]*putString\(CONFIG_KEY, newConfig\)[\s\S]*commit\(\)/,
  'Reset cleanup must delete late writes while preserving only a fresh post-reset protection config.',
);
requireMatch(
  storePath,
  store,
  /getOrCreate\([\s\S]*finalizeFactoryResetIfPending\(preferences\)[\s\S]*DrainBatch\.empty\(\)/,
  'No post-reset native payload may be exposed before tombstone cleanup.',
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
  pluginPath,
  plugin,
  /factoryResetProtectionData[\s\S]*NativeDrainBatchStore\.markFactoryReset[\s\S]*stopService/,
  'Factory reset must mark native data before stopping the protection service.',
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
  /factoryReset\(\)[\s\S]*factoryResetProtectionData/,
  'TypeScript bridge must expose the protected native factory-reset path.',
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
requireMatch(
  appPath,
  app,
  /resetApp = async[\s\S]*await NativeProtection\.factoryReset\(\)[\s\S]*StorageService\.clearState\(\)/,
  'Web state must be cleared only after Android confirms the protected native factory reset.',
);
requireMatch(
  appPath,
  app,
  /!appState\.hasCompletedOnboarding[\s\S]*NativeProtection\.sync/,
  'Native config sync must stay disabled before onboarding completes.',
);
requireMatch(
  appPath,
  app,
  /!appState\.hasCompletedOnboarding[\s\S]*NativeProtection\.drain/,
  'Native drain must stay disabled before onboarding completes.',
);

for (const [method, description] of [
  ['pendingBatchReplaysExactlyUntilMatchingAck', 'replay until ACK'],
  ['wrongAckCannotAdvanceUsageOrRemovePendingBatch', 'wrong-ACK rejection'],
  ['eventsCreatedAfterBatchStayQueuedWhenOldBatchIsAcknowledged', 'new-event preservation'],
  ['usageAccumulatedWhilePendingBecomesNextDeltaAfterAck', 'usage after pending snapshot'],
  ['acknowledgeIsIdempotentAfterSuccessfulRemoval', 'idempotent ACK'],
  ['factoryResetTombstoneDeletesLateServiceFlushBeforeAnyReplay', 'post-reset resurrection prevention'],
  ['resetCleanupPreservesOnlyFreshPostResetConfiguration', 'fresh config preservation after reset'],
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
requireMatch(
  bridgeTestPath,
  bridgeTest,
  /parses a valid native batch and acknowledges the same id explicitly/,
  'Bridge tests must cover valid drain and ACK routing.',
);
requireMatch(
  bridgeTestPath,
  bridgeTest,
  /requires an explicit native factory-reset confirmation/,
  'Bridge tests must fail closed when Android does not confirm factory-reset protection.',
);

if (findings.length > 0) {
  console.log('Native drain ACK contract check failed:\n');
  for (const finding of findings) console.log(`- ${finding.file}: ${finding.text}`);
  process.exit(1);
}

console.log(
  'Native drain ACK contract check passed. Persistent batch, transactional journal, reset tombstone, onboarding gate, and ACK guards are present.',
);
