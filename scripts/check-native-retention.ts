import { readFile } from 'node:fs/promises';

const policyPath = 'android/app/src/main/java/app/scrollshield/mobile/NativeCounterRetentionPolicy.java';
const policyTestPath = 'android/app/src/test/java/app/scrollshield/mobile/NativeCounterRetentionPolicyTest.java';
const storePath = 'android/app/src/main/java/app/scrollshield/mobile/NativeDrainBatchStore.java';
const instrumentedTestPath =
  'android/app/src/androidTest/java/app/scrollshield/mobile/NativeRetentionInstrumentedTest.java';

const [policy, policyTest, store, instrumentedTest] = await Promise.all([
  readFile(policyPath, 'utf8'),
  readFile(policyTestPath, 'utf8'),
  readFile(storePath, 'utf8'),
  readFile(instrumentedTestPath, 'utf8'),
]);

const findings: string[] = [];
const requirePattern = (file: string, content: string, pattern: RegExp, message: string) => {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
};

requirePattern(
  policyPath,
  policy,
  /shouldDeleteEphemeralCounter[\s\S]*currentDay[\s\S]*previousDay/,
  'Retention policy must keep current/previous-day ephemeral-counter semantics.',
);
requirePattern(
  policyPath,
  policy,
  /shouldDeleteFullyExportedUsage[\s\S]*current != exported[\s\S]*day\.compareTo\(oldestRetainedDay\) < 0/,
  'Historical usage must be deletable only after exact export acknowledgement and cutoff.',
);
requirePattern(
  policyTestPath,
  policyTest,
  /keepsCurrentAndPreviousDayEphemeralCounters[\s\S]*deletesOnlyOldUsageThatWasAlreadyFullyExported[\s\S]*keepsUsageInsideRetentionHorizonAndInconsistentMarkers/,
  'Pure JVM tests must cover ephemeral, acknowledged-usage, and inconsistent-marker boundaries.',
);

requirePattern(
  storePath,
  store,
  /RAW_USAGE_RETENTION_DAYS\s*=\s*30/,
  'Native raw usage retention must remain explicitly bounded to 30 calendar days after ACK.',
);
requirePattern(
  storePath,
  store,
  /cleanupConfirmedCounters[\s\S]*OPEN_EVENTS_PREFIX[\s\S]*EMERGENCY_COUNT_PREFIX[\s\S]*shouldDeleteEphemeralCounter/,
  'Runtime cleanup must apply the pure ephemeral-counter policy.',
);
requirePattern(
  storePath,
  store,
  /cleanupConfirmedCounters[\s\S]*shouldDeleteFullyExportedUsage[\s\S]*editor\.remove\(key\)[\s\S]*editor\.remove\(exportedKey\)/,
  'Runtime cleanup must remove raw usage and its export cursor only when the pure policy permits it.',
);
requirePattern(
  storePath,
  store,
  /editor\.remove\(PENDING_BATCH_KEY\)[\s\S]*if \(!editor\.commit\(\)\) return false;[\s\S]*cleanupConfirmedCounters/,
  'Counter cleanup must run only after the ACK cursor/pending-batch commit succeeds.',
);

for (const method of [
  'cleanupKeepsCurrentAndPreviousEphemeralCountersButRemovesOlderOnes',
  'cleanupDeletesOnlyOldUsageThatIsFullyAcknowledged',
  'cleanupRetainsMalformedAndUnrelatedKeys',
]) {
  requirePattern(
    instrumentedTestPath,
    instrumentedTest,
    new RegExp(`void\\s+${method}\\s*\\(`),
    `Android instrumentation must retain ${method}.`,
  );
}

if (findings.length > 0) {
  console.log('Native retention check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Native retention check passed. Ephemeral counters and fully ACKed raw usage are bounded without deleting unconfirmed data.',
);
