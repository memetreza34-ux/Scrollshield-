import { readFile } from 'node:fs/promises';

const coordinatorPath =
  'android/app/src/main/java/app/scrollshield/mobile/UsageFlushCoordinator.java';
const coordinatorTestPath =
  'android/app/src/test/java/app/scrollshield/mobile/UsageFlushCoordinatorTest.java';
const workerPath =
  'android/app/src/main/java/app/scrollshield/mobile/UsageFlushWorker.java';
const workerTestPath =
  'android/app/src/test/java/app/scrollshield/mobile/UsageFlushWorkerTest.java';
const servicePath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldProtectionService.java';

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
  /public void close\(\)[\s\S]*executor\.shutdown\(\)/,
  'Worker must expose orderly executor shutdown.',
);

for (const testName of [
  'successfulBackgroundWriteCompletesMatchingBatch',
  'commitFailureMergesBatchBackIntoPendingAccounting',
  'writerExceptionAlsoMergesBatchBack',
  'newUsageRemainsCountedWhileWorkerIsBlocked',
  'closedWorkerRejectsBatchAndReturnsItToPending',
]) {
  requirePattern(
    workerTestPath,
    workerTests,
    new RegExp(`void\\s+${testName}\\s*\\(`),
    `Worker JUnit must cover ${testName}.`,
  );
}

// This checker deliberately records the remaining integration boundary instead of pretending the
// main-thread problem is already solved. Once the service is migrated, this marker must disappear
// and the checker must be tightened to require actual coordinator/worker wiring in the service.
requirePattern(
  servicePath,
  service,
  /private void flushPendingUsage\([\s\S]*editor\.commit\(\)/,
  'Expected current pre-integration service boundary changed; review and tighten this checker.',
);

if (findings.length > 0) {
  console.log('Usage flush worker foundation check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Usage flush worker foundation check passed. Coordinator + serialized writer are guarded; productive service integration remains explicitly open.',
);
