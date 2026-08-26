import { readFile } from 'node:fs/promises';

const javaRoot = 'android/app/src/main/java/app/scrollshield/mobile';
const javaTestRoot = 'android/app/src/test/java/app/scrollshield/mobile';

const paths = {
  service: `${javaRoot}/ScrollShieldProtectionService.java`,
  policy: `${javaRoot}/UsageAccountingPolicy.java`,
  policyTest: `${javaTestRoot}/UsageAccountingPolicyTest.java`,
  coordinator: `${javaRoot}/UsageFlushCoordinator.java`,
  coordinatorTest: `${javaTestRoot}/UsageFlushCoordinatorTest.java`,
  worker: `${javaRoot}/UsageFlushWorker.java`,
  workerTest: `${javaTestRoot}/UsageFlushWorkerTest.java`,
  runtimeSpec: 'docs/PROTECTION_RUNTIME_CONFIG_STATE.md',
  matrix: 'docs/ANDROID_DEVICE_TEST_MATRIX.md',
} as const;

const entries = await Promise.all(
  Object.entries(paths).map(async ([key, file]) => [key, await readFile(file, 'utf8')] as const),
);
const source = Object.fromEntries(entries) as Record<keyof typeof paths, string>;
const findings: string[] = [];

function requirePattern(key: keyof typeof paths, pattern: RegExp, message: string) {
  if (!pattern.test(source[key])) findings.push(`${paths[key]}: ${message}`);
}

function forbidPattern(key: keyof typeof paths, pattern: RegExp, message: string) {
  if (pattern.test(source[key])) findings.push(`${paths[key]}: ${message}`);
}

requirePattern(
  'policy',
  /splitAtBoundary\(long startMs, long endMs, long boundaryMs\)[\s\S]*endMs <= startMs[\s\S]*boundaryMs - startMs[\s\S]*endMs - boundaryMs/,
  'UsageAccountingPolicy must split intervals deterministically and reject backward time.',
);
requirePattern(
  'policyTest',
  /splitsExactlyAtMidnightBoundary[\s\S]*doesNotProduceNegativeUsageWhenClockMovesBackward/,
  'JVM tests must cover midnight splitting and backward-clock safety.',
);

requirePattern(
  'service',
  /recordAllowedUsage\(@Nullable String foregroundPackage, long now\)[\s\S]*ProtectionRule previousRule = rulesByPackage\.get\(lastUsagePackage\)[\s\S]*temporaryAccessUntil\.get\(lastUsagePackage\)[\s\S]*boundedEnd[\s\S]*addPendingUsage\(previousRule\.id, lastUsageTickMs, boundedEnd\)/,
  'Allowed usage must be attributed through the rule that owned the previous measured interval.',
);
requirePattern(
  'service',
  /String startDay = getDayKey\(startMs\)[\s\S]*String endDay = getDayKey\(endMs - 1L\)[\s\S]*UsageAccountingPolicy\.splitAtBoundary/,
  'Measured usage must be assigned using the interval day, not the later flush time.',
);
requirePattern(
  'service',
  /addPendingUsageBucket\(String dayKey, String appId, long durationMs\)[\s\S]*usageFlushCoordinator\.addPendingUsage\(dayKey \+ "_" \+ appId, durationMs\)/,
  'Service must hand precomputed local-day + rule-id buckets to UsageFlushCoordinator.',
);
forbidPattern(
  'service',
  /Map<String, Long>\s+pendingUsageMs/,
  'Service-local pendingUsageMs must not return; coordinator owns pending/in-flight accounting.',
);

requirePattern(
  'coordinator',
  /pendingUsageMs = new HashMap[\s\S]*addPendingUsage\(String bucketKey, long durationMs\)[\s\S]*activeBatch[\s\S]*getUnpersistedUsageMs/,
  'Coordinator must own pending plus in-flight usage accounting.',
);
requirePattern(
  'coordinator',
  /beginFlush[\s\S]*activeBatch != null[\s\S]*snapshot = new HashMap<>\(pendingUsageMs\)[\s\S]*pendingUsageMs\.clear\(\)[\s\S]*Collections\.unmodifiableMap/,
  'At most one immutable usage snapshot may be in flight.',
);
requirePattern(
  'coordinator',
  /completeFlush[\s\S]*activeBatch\.id != batchId[\s\S]*if \(success\)[\s\S]*pendingUsageMs\.put/,
  'Only the current batch may complete; failed increments must merge back into pending usage.',
);
requirePattern(
  'coordinatorTest',
  /onlyOneFlushCanBeInFlightAndNewUsageStaysPending[\s\S]*failedFlushMergesSnapshotBackWithUsageThatArrivedDuringWrite[\s\S]*staleCompletionCannotAcknowledgeAnotherBatch[\s\S]*dailyLimitViewIncludesPendingAndInFlightUsage/,
  'Coordinator JUnit must retain in-flight, mergeback, stale-completion and daily-limit coverage.',
);

requirePattern(
  'worker',
  /Executors\.newSingleThreadExecutor[\s\S]*persistAndComplete[\s\S]*completeFlush\(batch\.id, success/,
  'Usage persistence must remain serialized off the service thread and ACK the exact batch.',
);
requirePattern(
  'worker',
  /persistBatch[\s\S]*String key = usageKeyPrefix \+ entry\.getKey\(\)[\s\S]*editor\.putLong[\s\S]*editor\.commit\(\)/,
  'Worker must persist the precomputed bucket key synchronously without rebucketing by flush time.',
);
requirePattern(
  'worker',
  /closeAfterDrainingPending[\s\S]*drainPendingBeforeShutdown[\s\S]*beginFlush\([\s\S]*true,[\s\S]*0L/,
  'Shutdown must force-drain pending usage through the serialized worker.',
);
requirePattern(
  'workerTest',
  /commitFailureMergesBatchBackIntoPendingAccounting[\s\S]*newUsageRemainsCountedWhileWorkerIsBlocked[\s\S]*shutdownDrainPersistsUsageAddedWhileFirstBatchIsInFlight[\s\S]*shutdownDrainRetriesOneFailedInFlightBatch/,
  'Worker JUnit must retain commit-failure, in-flight and shutdown-drain coverage.',
);

requirePattern(
  'service',
  /String dayAndAppKey = getDayKey\(now\) \+ "_" \+ appId[\s\S]*usageFlushCoordinator == null[\s\S]*usageFlushCoordinator\.getUnpersistedUsageMs\(dayAndAppKey\)/,
  'Daily-limit checks must include coordinator pending and in-flight usage for the current local day.',
);
requirePattern(
  'service',
  /String previousDay = getPreviousDayKey\(now\)[\s\S]*countRecentOpensForKey[\s\S]*OPEN_KEY_PREFIX \+ previousDay/,
  'Anti-Binge windows must include previous-day opens when the rolling window crosses midnight.',
);

requirePattern(
  'service',
  /shouldInvalidateRuntimeState\([\s\S]*if \(invalidateRuntimeState\)[\s\S]*generationBoundaryAt = System\.currentTimeMillis\(\)[\s\S]*recordAllowedUsage\(null, generationBoundaryAt\)[\s\S]*cachedConfigGeneration = configGeneration[\s\S]*rulesByPackage\.clear\(\)/,
  'A confirmed config generation switch must close the G1 usage interval before G2 replaces the rule map.',
);
requirePattern(
  'runtimeSpec',
  /RUNTIME-04[\s\S]*generationBoundaryAt[\s\S]*previousRule\.id[\s\S]*keine doppelte Zählung/i,
  'Runtime specification must define the source-hardened generation usage boundary and physical evidence.',
);
requirePattern(
  'matrix',
  /TIME-01[\s\S]*Daily usage, opens, and emergency counters move to the correct date/,
  'Device matrix must retain local-midnight counter validation.',
);

if (findings.length > 0) {
  console.log('Native usage accounting check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Native usage accounting check passed. Coordinator/worker ownership, local-day bucketing, pending/in-flight daily-limit accounting, shutdown drain, midnight handling, and the G1→G2 usage boundary remain guarded.',
);
