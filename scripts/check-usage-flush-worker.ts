import { readFile } from 'node:fs/promises';

const coordinatorPath = 'android/app/src/main/java/app/scrollshield/mobile/UsageFlushCoordinator.java';
const coordinatorTestPath = 'android/app/src/test/java/app/scrollshield/mobile/UsageFlushCoordinatorTest.java';
const workerPath = 'android/app/src/main/java/app/scrollshield/mobile/UsageFlushWorker.java';
const workerTestPath = 'android/app/src/test/java/app/scrollshield/mobile/UsageFlushWorkerTest.java';
const servicePath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldProtectionService.java';

const [coordinator, coordinatorTests, worker, workerTests, service] = await Promise.all([
  readFile(coordinatorPath, 'utf8'),
  readFile(coordinatorTestPath, 'utf8'),
  readFile(workerPath, 'utf8'),
  readFile(workerTestPath, 'utf8'),
  readFile(servicePath, 'utf8'),
]);

const findings: string[] = [];

const requirePattern = (file: string, content: string, pattern: RegExp, message: string) => {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
};

requirePattern(
  coordinatorPath,
  coordinator,
  /synchronized\s+FlushBatch\s+beginFlush\([\s\S]*activeBatch != null[\s\S]*pendingUsageMs\.isEmpty\(\)/,
  'Coordinator must serialize flush creation and reject a second in-flight batch.',
);
requirePattern(
  coordinatorPath,
  coordinator,
  /Map<String, Long> snapshot = new HashMap<>\(pendingUsageMs\);[\s\S]*pendingUsageMs\.clear\(\);[\s\S]*activeBatch = new FlushBatch/,
  'A flush must atomically move the pending snapshot into explicit in-flight state.',
);
requirePattern(
  coordinatorPath,
  coordinator,
  /completeFlush\([\s\S]*activeBatch == null \|\| activeBatch\.id != batchId[\s\S]*if \(success\)[\s\S]*for \(Map\.Entry<String, Long> entry : completed\.increments\.entrySet\(\)\)/,
  'Completion must reject stale callbacks and merge failed increments back into pending state.',
);
requirePattern(
  coordinatorPath,
  coordinator,
  /getUnpersistedUsageMs\([\s\S]*pendingUsageMs\.getOrDefault[\s\S]*activeBatch\.increments\.getOrDefault[\s\S]*saturatingAdd/,
  'Daily-limit accounting must include both pending and in-flight usage.',
);
requirePattern(
  coordinatorPath,
  coordinator,
  /Collections\.unmodifiableMap\(new HashMap<>\(increments\)\)/,
  'Worker snapshots must be immutable after hand-off.',
);

for (const testName of [
  'intervalBlocksNormalFlushButForceBypassesIt',
  'onlyOneFlushCanBeInFlightAndNewUsageStaysPending',
  'successfulFlushDropsOnlyItsSnapshot',
  'failedFlushMergesSnapshotBackWithUsageThatArrivedDuringWrite',
  'staleCompletionCannotAcknowledgeAnotherBatch',
  'dailyLimitViewIncludesPendingAndInFlightUsage',
  'invalidDurationsAndKeysDoNotEnterAccounting',
  'accountingSaturatesInsteadOfOverflowingNegative',
]) {
  requirePattern(
    coordinatorTestPath,
    coordinatorTests,
    new RegExp(`void\\s+${testName}\\s*\\(`),
    `Coordinator JUnit must cover ${testName}.`,
  );
}

requirePattern(
  workerPath,
  worker,
  /Executors\.newSingleThreadExecutor/,
  'Production worker factory must use a serialized single-thread executor.',
);
requirePattern(
  workerPath,
  worker,
  /executor\.execute\(\(\) -> persistAndComplete\(batch\)\)/,
  'Batch persistence must be dispatched to the worker executor.',
);
requirePattern(
  workerPath,
  worker,
  /catch \(RejectedExecutionException error\)[\s\S]*completeFlush\(batch\.id, false/,
  'Executor rejection must return the active batch to pending accounting.',
);
requirePattern(
  workerPath,
  worker,
  /persistAndComplete\([\s\S]*writer\.write\(batch\)[\s\S]*catch \(RuntimeException error\)[\s\S]*finally[\s\S]*completeFlush\(batch\.id, success/,
  'Writer failure or exception must always complete the coordinator with an explicit result.',
);
requirePattern(
  workerPath,
  worker,
  /persistBatch\([\s\S]*preferences\.getLong\(key, 0L\)[\s\S]*editor\.putLong[\s\S]*return editor\.commit\(\)/,
  'SharedPreferences persistence must remain synchronous inside the worker so commit failure is observable.',
);
requirePattern(
  workerPath,
  worker,
  /closeAfterDrainingPending\(\)[\s\S]*executor\.execute\(this::drainPendingBeforeShutdown\)[\s\S]*executor\.shutdown\(\)/,
  'Service shutdown must queue a final serialized drain before shutting down the executor.',
);
requirePattern(
  workerPath,
  worker,
  /drainPendingBeforeShutdown\(\)[\s\S]*beginFlush\([\s\S]*true,[\s\S]*0L[\s\S]*persistAndComplete\(batch\)/,
  'Shutdown drain must force-flush coordinator pending usage on the worker thread.',
);
requirePattern(
  workerPath,
  worker,
  /public void close\(\)[\s\S]*executor\.shutdown\(\)/,
  'Worker must retain orderly executor shutdown.',
);

for (const testName of [
  'successfulBackgroundWriteCompletesMatchingBatch',
  'commitFailureMergesBatchBackIntoPendingAccounting',
  'writerExceptionAlsoMergesBatchBack',
  'newUsageRemainsCountedWhileWorkerIsBlocked',
  'shutdownDrainPersistsUsageAddedWhileFirstBatchIsInFlight',
  'shutdownDrainRetriesOneFailedInFlightBatch',
  'closedWorkerRejectsBatchAndReturnsItToPending',
]) {
  requirePattern(
    workerTestPath,
    workerTests,
    new RegExp(`void\\s+${testName}\\s*\\(`),
    `Worker JUnit must cover ${testName}.`,
  );
}

requirePattern(
  servicePath,
  service,
  /private UsageFlushCoordinator usageFlushCoordinator;[\s\S]*private UsageFlushWorker usageFlushWorker;/,
  'Protection service must own coordinator and worker instances.',
);
requirePattern(
  servicePath,
  service,
  /usageFlushCoordinator = new UsageFlushCoordinator\(lastUsageTickMs\);[\s\S]*UsageFlushWorker\.forSharedPreferences\([\s\S]*USAGE_KEY_PREFIX,[\s\S]*usageFlushCoordinator/,
  'Protection service must initialize the serialized usage persistence pipeline on create.',
);
requirePattern(
  servicePath,
  service,
  /addPendingUsageBucket\([\s\S]*usageFlushCoordinator\.addPendingUsage\(dayKey \+ "_" \+ appId, durationMs\)/,
  'Measured usage must enter the coordinator instead of a service-owned pending map.',
);
requirePattern(
  servicePath,
  service,
  /flushPendingUsage\([\s\S]*usageFlushCoordinator\.beginFlush\([\s\S]*USAGE_FLUSH_INTERVAL_MS[\s\S]*usageFlushWorker\.submit\(batch\)/,
  'Periodic usage flush must hand frozen batches to the background worker.',
);
requirePattern(
  servicePath,
  service,
  /getDailyUsageMs\([\s\S]*getUnpersistedUsageMs\(dayAndAppKey\)[\s\S]*saturatingAdd\(persisted, unpersisted\)/,
  'Daily-limit reads must include pending and in-flight coordinator usage.',
);
requirePattern(
  servicePath,
  service,
  /onDestroy\(\)[\s\S]*recordAllowedUsage\(null, shutdownNow\)[\s\S]*flushPendingUsage\(shutdownNow, true\)[\s\S]*closeAfterDrainingPending\(\)/,
  'Service shutdown must capture the final usage tick, request a force flush, and drain pending worker state.',
);

if (/editor\.commit\s*\(/.test(service)) {
  findings.push(`${servicePath}: SharedPreferences.commit() must not execute directly inside the protection service.`);
}
if (/private final Map<String, Long> pendingUsageMs/.test(service)) {
  findings.push(`${servicePath}: service-owned pending usage map must stay removed after coordinator integration.`);
}
if (/lastUsageFlushMs/.test(service)) {
  findings.push(`${servicePath}: flush timing must be owned by UsageFlushCoordinator, not duplicated in the service.`);
}

if (findings.length > 0) {
  console.log('Usage flush worker integration check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Usage flush worker integration check passed. Protection-service usage persistence is coordinator-backed, serialized off the main thread, and shutdown-drained.',
);
