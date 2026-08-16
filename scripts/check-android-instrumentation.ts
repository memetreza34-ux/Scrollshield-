import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type Finding = {
  file: string;
  text: string;
};

const findings: Finding[] = [];
const androidDir = 'android';

if (!existsSync(androidDir)) {
  console.log('Android instrumentation check skipped: android project absent.');
  process.exit(0);
}

const buildGradlePath = path.join(androidDir, 'app', 'build.gradle');
const testRoot = path.join(
  androidDir,
  'app',
  'src',
  'androidTest',
  'java',
  'app',
  'scrollshield',
  'mobile',
);
const stateTestPath = path.join(testRoot, 'ProtectionStateInstrumentedTest.java');
const manifestTestPath = path.join(testRoot, 'ManifestSecurityInstrumentedTest.java');
const recoveryTestPath = path.join(testRoot, 'BootRecoveryInstrumentedTest.java');
const usageFlushTestPath = path.join(testRoot, 'UsageFlushInstrumentedTest.java');

for (const requiredPath of [
  buildGradlePath,
  stateTestPath,
  manifestTestPath,
  recoveryTestPath,
  usageFlushTestPath,
]) {
  if (!existsSync(requiredPath)) {
    findings.push({ file: requiredPath, text: 'Required Android instrumentation contract file is missing.' });
  }
}

if (findings.length === 0) {
  const buildGradle = await readFile(buildGradlePath, 'utf8');
  const stateTest = await readFile(stateTestPath, 'utf8');
  const manifestTest = await readFile(manifestTestPath, 'utf8');
  const recoveryTest = await readFile(recoveryTestPath, 'utf8');
  const usageFlushTest = await readFile(usageFlushTestPath, 'utf8');

  const requireMatch = (file: string, content: string, pattern: RegExp, text: string) => {
    if (!pattern.test(content)) findings.push({ file, text });
  };

  requireMatch(
    buildGradlePath,
    buildGradle,
    /testInstrumentationRunner\s+"androidx\.test\.runner\.AndroidJUnitRunner"/,
    'AndroidJUnitRunner must remain configured for on-device instrumentation.',
  );
  requireMatch(
    buildGradlePath,
    buildGradle,
    /androidTestImplementation\s+"androidx\.test\.ext:junit:/,
    'AndroidX JUnit instrumentation dependency is required.',
  );
  requireMatch(
    buildGradlePath,
    buildGradle,
    /androidTestImplementation\s+"androidx\.test\.espresso:espresso-core:/,
    'Espresso instrumentation dependency is required for runtime/UI expansion.',
  );

  for (const [method, description] of [
    ['protectionDefaultsToDisabled', 'default native protection state'],
    ['successfulStartAndDisablePersistLifecycleTruth', 'start/stop lifecycle persistence'],
    ['explicitStopDiagnosticIsNormalizedAndPersisted', 'diagnostic persistence/normalization'],
    ['configuredAppsRequireAtLeastOneInstalledActiveTarget', 'installed-target validation'],
  ]) {
    requireMatch(
      stateTestPath,
      stateTest,
      new RegExp(`void\\s+${method}\\s*\\(`),
      `Instrumentation must cover ${description}.`,
    );
  }

  for (const [method, description] of [
    ['mergedManifestContainsOnlyReviewedPermissions', 'the merged permission surface'],
    ['applicationBackupRemainsDisabled', 'runtime backup policy'],
    ['protectionServiceIsRegisteredAndNotExported', 'service export security'],
    ['bootReceiverIsExplicitlyRegisteredForSystemRecovery', 'boot receiver registration'],
  ]) {
    requireMatch(
      manifestTestPath,
      manifestTest,
      new RegExp(`void\\s+${method}\\s*\\(`),
      `Instrumentation must cover ${description}.`,
    );
  }

  for (const [method, description] of [
    ['unrelatedBroadcastDoesNotChangeExplicitActivation', 'unrelated broadcast isolation'],
    ['bootRecoveryFailsClosedWhenNoInstalledTargetExists', 'boot fail-closed recovery'],
    ['packageReplacementRecoveryAlsoFailsClosedWithoutTarget', 'app-update fail-closed recovery'],
  ]) {
    requireMatch(
      recoveryTestPath,
      recoveryTest,
      new RegExp(`void\\s+${method}\\s*\\(`),
      `Instrumentation must cover ${description}.`,
    );
  }

  for (const [method, description] of [
    ['productionWorkerPersistsCoordinatorBatchIntoSharedPreferences', 'real SharedPreferences worker persistence'],
    ['shutdownDrainPersistsUsageAddedDuringInFlightAndroidWrite', 'Android shutdown drain with in-flight usage'],
  ]) {
    requireMatch(
      usageFlushTestPath,
      usageFlushTest,
      new RegExp(`void\\s+${method}\\s*\\(`),
      `Instrumentation must cover ${description}.`,
    );
  }

  requireMatch(
    usageFlushTestPath,
    usageFlushTest,
    /UsageFlushWorker\.forSharedPreferences\([\s\S]*preferences,[\s\S]*USAGE_KEY_PREFIX,[\s\S]*coordinator/,
    'On-device instrumentation must exercise the production SharedPreferences worker factory.',
  );
  requireMatch(
    usageFlushTestPath,
    usageFlushTest,
    /closeAfterDrainingPending\(\)[\s\S]*awaitTermination/,
    'On-device instrumentation must exercise the serialized shutdown drain.',
  );

  requireMatch(
    manifestTestPath,
    manifestTest,
    /assertFalse\([^;]*android\.permission\.INTERNET/s,
    'On-device manifest instrumentation must reject INTERNET for offline-first v1.',
  );
  requireMatch(
    manifestTestPath,
    manifestTest,
    /EXPECTED_PERMISSIONS\.containsAll\(actualPermissions\)/,
    'On-device manifest instrumentation must reject unreviewed merged permissions.',
  );
}

if (findings.length > 0) {
  console.log('Android instrumentation contract check failed:\n');
  for (const finding of findings) console.log(`- ${finding.file}: ${finding.text}`);
  process.exit(1);
}

console.log(
  'Android instrumentation contract check passed. Runtime state, recovery, merged-manifest, and real Android usage-persistence tests are present.',
);
