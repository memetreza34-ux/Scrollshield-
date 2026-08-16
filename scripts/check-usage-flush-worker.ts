import { readFile } from 'node:fs/promises';

const coordinatorPath =
  'android/app/src/main/java/app/scrollshield/mobile/UsageFlushCoordinator.java';
const testPath =
  'android/app/src/test/java/app/scrollshield/mobile/UsageFlushCoordinatorTest.java';
const servicePath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldProtectionService.java';

const [coordinator, tests, service] = await Promise.all([
  readFile(coordinatorPath, 'utf8'),
  readFile(testPath, 'utf8'),
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
  'Daily-limit accounting must be able to include both pending and in-flight usage.',
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
    testPath,
    tests,
    new RegExp(`void\\s+${testName}\\s*\\(`),
    `JUnit must cover ${testName}.`,
  );
}

// This checker deliberately records the remaining integration boundary instead of pretending the
// main-thread problem is already solved. Once the service is migrated, this marker must disappear
// and the checker will be tightened to require the executor-backed integration.
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
  'Usage flush worker foundation check passed. Lossless pending/in-flight/failure semantics are present; service executor integration remains explicitly open.',
);
