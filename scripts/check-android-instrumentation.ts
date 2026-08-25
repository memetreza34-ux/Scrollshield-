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
const diagnosticsTestPath = path.join(testRoot, 'ProtectionDiagnosticsInstrumentedTest.java');

for (const requiredPath of [
  buildGradlePath,
  stateTestPath,
  manifestTestPath,
  recoveryTestPath,
  usageFlushTestPath,
  diagnosticsTestPath,
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
  const diagnosticsTest = await readFile(diagnosticsTestPath, 'utf8');

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

  requireMatch(
    recoveryTestPath,
    recoveryTest,
    /bootRecoveryFailsClosedWhenNoInstalledTargetExists[\s\S]*assertFalse\(ScrollShieldNativePlugin\.isProtectionEnabled\(context\)\)[\s\S]*getLastProtectionStopCode[\s\S]*getLastProtectionStopMessage[\s\S]*getLastProtectionStopAt[\s\S]*new JSONArray\(preferences\.getString\("protection_events"[\s\S]*"warning"[\s\S]*"system"/,
    'Boot recovery instrumentation must inspect the fail-closed state, exact diagnostics, timestamp, and persisted system warning event.',
  );
  requireMatch(
    recoveryTestPath,
    recoveryTest,
    /packageReplacementRecoveryAlsoFailsClosedWithoutTarget[\s\S]*ACTION_MY_PACKAGE_REPLACED[\s\S]*recovery_target_app_missing[\s\S]*protection_events/,
    'Package-replacement recovery must retain the persisted warning-event contract.',
  );

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

  for (const [method, description] of [
    ['startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence', 'start-request versus confirmed-start persistence'],
    ['terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite', 'terminal stop winning a delayed start confirmation race'],
    ['restartRequestAdvancesBeyondLatestStopBoundary', 'strictly ordered immediate restart generation'],
    ['atomicPrerequisiteStopPersistsDisabledStateEventAndExactCode', 'atomic disabled-state/event/diagnostic persistence'],
    ['atomicPrerequisiteStopAlsoPersistsWhenProtectionWasAlreadyDisabled', 'first-start prerequisite persistence while activation is already false'],
    ['atomicSystemStartFailurePersistsDisabledStateEventAndStableCode', 'technical START_FAILED system-stop persistence'],
    ['atomicUnexpectedDestroyPersistsDisabledStateEventAndStableCode', 'unexpected service-destroy system-stop persistence'],
    ['atomicTerminalStopsPersistExactCodesWithoutWarningEvents', 'manual/notification terminal-stop persistence without warning events'],
    ['explicitPrerequisiteCodesPersistIndependentOfMessageLanguage', 'language-independent explicit prerequisite diagnostics'],
    ['legacySystemPermissionWarningsStillPersistStableStopDiagnostics', 'legacy permission-warning diagnostic compatibility'],
    ['legacySystemConfigurationWarningsStillPersistStableStopDiagnostics', 'legacy configuration-warning diagnostic compatibility'],
    ['appSpecificWarningsDoNotOverwriteTerminalSystemStopDiagnostics', 'terminal diagnostic isolation from app warnings'],
  ]) {
    requireMatch(
      diagnosticsTestPath,
      diagnosticsTest,
      new RegExp(`void\\s+${method}\\s*\\(`),
      `Instrumentation must cover ${description}.`,
    );
  }

  requireMatch(
    diagnosticsTestPath,
    diagnosticsTest,
    /startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence[\s\S]*recordProtectionStartRequested[\s\S]*ProtectionStartConfirmationResult\.CONFIRMED[\s\S]*confirmedStartAt > requestAt/,
    'Instrumentation must prove confirmed-start evidence is strictly newer than its request generation.',
  );
  requireMatch(
    diagnosticsTestPath,
    diagnosticsTest,
    /terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite[\s\S]*recordProtectionTerminalStop[\s\S]*stopAt > requestAt[\s\S]*ProtectionStartConfirmationResult\.SUPERSEDED_BY_STOP[\s\S]*assertEquals\(0L, ScrollShieldNativePlugin\.getLastProtectionStartAt[\s\S]*getLastProtectionStopCode[\s\S]*getLastProtectionStopMessage[\s\S]*assertEquals\(eventsAfterStop, preferences\.getString\("protection_events"/,
    'Instrumentation must prove a delayed start cannot overwrite a newer terminal stop, its exact diagnostics, or its event history.',
  );
  requireMatch(
    diagnosticsTestPath,
    diagnosticsTest,
    /restartRequestAdvancesBeyondLatestStopBoundary[\s\S]*stopAt > firstRequestAt[\s\S]*restartRequestAt > stopAt[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*ProtectionStartConfirmationResult\.CONFIRMED[\s\S]*getLastProtectionStartAt\(context\) > restartRequestAt/,
    'Instrumentation must prove a same-session restart creates a strictly newer request that remains confirmable.',
  );

  for (const constant of [
    'USAGE_ACCESS_MISSING',
    'OVERLAY_PERMISSION_MISSING',
    'NOTIFICATIONS_MISSING',
    'NO_ACTIVE_RULES',
    'TARGET_APP_MISSING',
    'START_FAILED',
  ]) {
    requireMatch(
      diagnosticsTestPath,
      diagnosticsTest,
      new RegExp(`ProtectionStopReasonPolicy\\.${constant}`),
      `On-device diagnostics instrumentation must exercise stable constant ${constant}.`,
    );
  }

  for (const constant of ['MANUAL_APP_STOP_CODE', 'NOTIFICATION_ACTION_STOP_CODE', 'UNEXPECTED_SERVICE_DESTROY_CODE']) {
    requireMatch(
      diagnosticsTestPath,
      diagnosticsTest,
      new RegExp(`ProtectionServiceLifecyclePolicy\\.${constant}`),
      `On-device diagnostics instrumentation must exercise lifecycle constant ${constant}.`,
    );
  }

  requireMatch(
    diagnosticsTestPath,
    diagnosticsTest,
    /recordProtectionPrerequisiteStop\([\s\S]*assertFalse\(ScrollShieldNativePlugin\.isProtectionEnabled\(context\)\)[\s\S]*new JSONArray\(preferences\.getString\("protection_events"/,
    'On-device diagnostics instrumentation must prove the compatibility prerequisite transaction persists disabled state and the warning event.',
  );
  requireMatch(
    diagnosticsTestPath,
    diagnosticsTest,
    /atomicSystemStartFailurePersistsDisabledStateEventAndStableCode[\s\S]*recordProtectionSystemStop\([\s\S]*START_FAILED[\s\S]*assertFalse\(ScrollShieldNativePlugin\.isProtectionEnabled\(context\)\)[\s\S]*protection_events/,
    'On-device diagnostics instrumentation must prove the generic system-stop transaction persists START_FAILED atomically.',
  );
  requireMatch(
    diagnosticsTestPath,
    diagnosticsTest,
    /atomicUnexpectedDestroyPersistsDisabledStateEventAndStableCode[\s\S]*recordProtectionSystemStop\([\s\S]*UNEXPECTED_SERVICE_DESTROY_CODE[\s\S]*assertFalse\(ScrollShieldNativePlugin\.isProtectionEnabled\(context\)\)[\s\S]*protection_events/,
    'On-device diagnostics instrumentation must prove unexpected_service_destroy uses the same atomic system-stop persistence contract.',
  );
  requireMatch(
    diagnosticsTestPath,
    diagnosticsTest,
    /atomicTerminalStopsPersistExactCodesWithoutWarningEvents[\s\S]*MANUAL_APP_STOP_CODE[\s\S]*NOTIFICATION_ACTION_STOP_CODE[\s\S]*recordProtectionTerminalStop[\s\S]*assertEquals\(expectedEventsJson, preferences\.getString\("protection_events"/,
    'On-device diagnostics instrumentation must prove manual and notification terminal stops persist atomically without changing the event queue.',
  );
  requireMatch(
    diagnosticsTestPath,
    diagnosticsTest,
    /appendProtectionEvent\([\s\S]*"warning",[\s\S]*"system"/,
    'On-device diagnostics instrumentation must retain the legacy system-warning compatibility path.',
  );
  requireMatch(
    diagnosticsTestPath,
    diagnosticsTest,
    /recordProtectionStop\([\s\S]*MANUAL_APP_STOP_CODE[\s\S]*appendProtectionEvent\([\s\S]*"instagram"[\s\S]*assertEquals\([\s\S]*MANUAL_APP_STOP_CODE/,
    'App-specific warning instrumentation must prove it cannot overwrite an existing terminal stop reason.',
  );

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
  'Android instrumentation contract check passed. Runtime state, boot/update recovery, start-stop race ordering, delayed-confirmation stop winner, immediate restart generation, usage persistence, atomic stop diagnostics, and manifest tests are present.',
);
