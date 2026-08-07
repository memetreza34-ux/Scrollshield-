import { readFile } from 'node:fs/promises';

const servicePath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldProtectionService.java';
const policyPath = 'android/app/src/main/java/app/scrollshield/mobile/UsageAccountingPolicy.java';
const policyTestPath = 'android/app/src/test/java/app/scrollshield/mobile/UsageAccountingPolicyTest.java';
const matrixPath = 'docs/ANDROID_DEVICE_TEST_MATRIX.md';

const [service, policy, policyTest, matrix] = await Promise.all([
  readFile(servicePath, 'utf8'),
  readFile(policyPath, 'utf8'),
  readFile(policyTestPath, 'utf8'),
  readFile(matrixPath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

function rejectPattern(file: string, content: string, pattern: RegExp, message: string) {
  if (!pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

requirePattern(
  policyPath,
  policy,
  /splitAtBoundary\(long startMs, long endMs, long boundaryMs\)[\s\S]*endMs <= startMs[\s\S]*boundaryMs - startMs[\s\S]*endMs - boundaryMs/,
  'UsageAccountingPolicy must split intervals deterministically and reject backward time.',
);
requirePattern(
  policyTestPath,
  policyTest,
  /splitsExactlyAtMidnightBoundary[\s\S]*doesNotProduceNegativeUsageWhenClockMovesBackward/,
  'JVM tests must cover midnight splitting and backward-clock safety.',
);
requirePattern(
  servicePath,
  service,
  /String startDay = getDayKey\(startMs\)[\s\S]*String endDay = getDayKey\(endMs - 1L\)[\s\S]*UsageAccountingPolicy\.splitAtBoundary/,
  'Measured usage must be assigned using the interval day, not the later flush time.',
);
requirePattern(
  servicePath,
  service,
  /String bucketKey = dayKey \+ "_" \+ appId[\s\S]*pendingUsageMs\.put\(bucketKey/,
  'Pending usage must be keyed by local day plus app.',
);
requirePattern(
  servicePath,
  service,
  /String key = USAGE_KEY_PREFIX \+ entry\.getKey\(\)/,
  'Flush must persist the precomputed day-and-app bucket without rebucketing to the flush day.',
);
rejectPattern(
  servicePath,
  service,
  /String dayKey = getDayKey\(now\);[\s\S]{0,500}USAGE_KEY_PREFIX \+ dayKey \+ "_" \+ entry\.getKey\(\)/,
  'The old flush-time day assignment must not return.',
);
requirePattern(
  servicePath,
  service,
  /String dayAndAppKey = getDayKey\(now\) \+ "_" \+ appId[\s\S]*pendingUsageMs\.containsKey\(dayAndAppKey\)/,
  'Daily-limit checks must include only pending usage for the current local day.',
);
requirePattern(
  servicePath,
  service,
  /String previousDay = getPreviousDayKey\(now\)[\s\S]*countRecentOpensForKey[\s\S]*OPEN_KEY_PREFIX \+ previousDay/,
  'Anti-Binge windows must include previous-day opens when the rolling window crosses midnight.',
);
requirePattern(
  matrixPath,
  matrix,
  /TIME-01[\s\S]*Daily usage, opens, and emergency counters move to the correct date/,
  'Device matrix must retain local-midnight counter validation.',
);

if (findings.length > 0) {
  console.log('Native usage accounting check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Native usage accounting check passed. Measured usage is bucketed by local day before flush, daily limits use the current-day pending bucket, and Anti-Binge windows bridge midnight.',
);
