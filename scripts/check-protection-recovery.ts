import { readFile } from 'node:fs/promises';

const appPath = 'src/App.tsx';
const policyPath = 'src/lib/protectionRecovery.ts';
const policyTestPath = 'src/lib/protectionRecovery.test.ts';
const appTestPath = 'src/App.protectionRecovery.test.tsx';
const preparedStartTestPath = 'src/lib/nativeProtectionPreparedStart.test.ts';
const bootReceiverPath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldBootReceiver.java';
const pluginPath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldNativePlugin.java';
const bootRecoveryTestPath =
  'android/app/src/androidTest/java/app/scrollshield/mobile/BootRecoveryInstrumentedTest.java';

const [
  app,
  policy,
  policyTest,
  appTest,
  preparedStartTest,
  bootReceiver,
  plugin,
  bootRecoveryTest,
] = await Promise.all([
  readFile(appPath, 'utf8'),
  readFile(policyPath, 'utf8'),
  readFile(policyTestPath, 'utf8'),
  readFile(appTestPath, 'utf8'),
  readFile(preparedStartTestPath, 'utf8'),
  readFile(bootReceiverPath, 'utf8'),
  readFile(pluginPath, 'utf8'),
  readFile(bootRecoveryTestPath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
}

requirePattern(
  policyPath,
  policy,
  /config\.active && !unavailable\.has\(config\.id\)/,
  'Recovery target selection must require an active installed app.',
);
requirePattern(
  policyPath,
  policy,
  /status\.enabled[\s\S]*!status\.running[\s\S]*installedActiveAppIds\.length > 0[\s\S]*status\.health === 'stale-activation'/,
  'Normal app-open restart policy must be limited to stale activation with an installed target.',
);
requirePattern(
  policyTestPath,
  policyTest,
  /restarts only a safe stale activation with an installed active target[\s\S]*stale-activation[\s\S]*unclean-process-stop[\s\S]*start-pending[\s\S]*start-interrupted[\s\S]*\[\]/,
  'Recovery policy tests must prove process loss, pending/interrupted starts, and missing targets do not enter the generic stale-start path.',
);
requirePattern(
  appPath,
  app,
  /NativeProtection\.getStatus\(\)[\s\S]*serviceStatus\.health === 'start-pending'[\s\S]*setTimeout\([\s\S]*syncAndRecoverProtection/,
  'App-open recovery must read lifecycle truth first and defer all sync/start work while a fresh confirmation is pending.',
);
requirePattern(
  appPath,
  app,
  /serviceStatus\.health === 'unclean-process-stop'[\s\S]*NativeProtection\.recoverAfterProcessLoss\([\s\S]*return;[\s\S]*NativeProtection\.syncCommitted\([\s\S]*getInstalledActiveProtectionIds[\s\S]*shouldRecoverStaleProtection[\s\S]*NativeProtection\.startCommitted\(synced\.configGeneration\)/,
  'Confirmed process loss must route directly to controlled recovery; generic stale activation must reuse the single durable app-open config generation instead of syncing again inside start.',
);
requirePattern(
  appTestPath,
  appTest,
  /restarts a stale service with the single durable generation produced by app-open sync[\s\S]*syncCommittedMock\)\.toHaveBeenCalledTimes\(1\)[\s\S]*startCommittedMock\)\.toHaveBeenCalledTimes\(1\)[\s\S]*syncMock\)\.not\.toHaveBeenCalled[\s\S]*startMock\)\.not\.toHaveBeenCalled/,
  'App integration tests must prove stale activation commits one config generation and dispatches that exact prepared generation without a second sync.',
);
requirePattern(
  appTestPath,
  appTest,
  /uses controlled process-loss recovery without a duplicate app-level config sync[\s\S]*recoverMock\)\.toHaveBeenCalled[\s\S]*syncCommittedMock\)\.not\.toHaveBeenCalled[\s\S]*startCommittedMock\)\.not\.toHaveBeenCalled/,
  'App-open process-loss handling must not perform a generic prepared sync/start before controlled recovery.',
);
requirePattern(
  appTestPath,
  appTest,
  /does not invalidate a fresh pending start request with config sync or a duplicate start[\s\S]*syncCommittedMock\)\.not\.toHaveBeenCalled[\s\S]*startCommittedMock\)\.not\.toHaveBeenCalled/,
  'A fresh pending start must not be invalidated by app-open prepared sync or duplicate recovery dispatch.',
);
requirePattern(
  preparedStartTestPath,
  preparedStartTest,
  /starts an already committed generation without performing a second config sync[\s\S]*syncProtectionConfigMock\)\.toHaveBeenCalledTimes\(1\)[\s\S]*expectedConfigGeneration: CONFIG_GENERATION/,
  'Bridge tests must prove startCommitted reuses the exact durable generation without a second native config sync.',
);
requirePattern(
  preparedStartTestPath,
  preparedStartTest,
  /fails closed before Android dispatch when the prepared generation is invalid[\s\S]*startProtectionServiceMock\)\.not\.toHaveBeenCalled/,
  'Prepared native starts must fail closed before Android dispatch when their durable generation is invalid.',
);
requirePattern(
  bootReceiverPath,
  bootReceiver,
  /BOOT_COMPLETED|MY_PACKAGE_REPLACED|ACTION_LOCKED_BOOT_COMPLETED|PACKAGE_REPLACED|recovery_/,
  'Boot/update recovery must remain present alongside foreground app-open recovery.',
);
requirePattern(
  bootReceiverPath,
  bootReceiver,
  /private void stopRecovery\([\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*stopRecoveryLocked[\s\S]*private void stopRecoveryLocked[\s\S]*persistProtectionSystemStopWithFallback\(context, code, message\)[\s\S]*dispatchControlledStop\(context\)/,
  'Boot/update recovery failures must persist atomically and serialize the Android stop dispatch.',
);
requirePattern(
  pluginPath,
  plugin,
  /persistProtectionSystemStopWithFallback\([\s\S]*recordProtectionSystemStop\(context, reasonCode, description\)[\s\S]*if \(!persisted\)[\s\S]*setProtectionEnabled\(context, false\)[\s\S]*recordProtectionStop\(context, reasonCode, description\)/,
  'The shared recovery/system-stop wrapper must use the atomic native transaction first and keep separate writes only as a commit-failure fallback.',
);

const stopRecoveryStart = bootReceiver.indexOf('private void stopRecovery');
if (stopRecoveryStart < 0) {
  findings.push(`${bootReceiverPath}: Could not isolate stopRecovery helper.`);
} else {
  const stopRecoveryBody = bootReceiver.slice(stopRecoveryStart);
  for (const forbidden of ['setProtectionEnabled(', 'appendProtectionEvent(', 'recordProtectionStop(']) {
    if (stopRecoveryBody.includes(forbidden)) {
      findings.push(
        `${bootReceiverPath}: stopRecovery must delegate to the shared atomic wrapper instead of performing '${forbidden}' locally.`,
      );
    }
  }
}

requirePattern(
  bootRecoveryTestPath,
  bootRecoveryTest,
  /bootRecoveryFailsClosedWhenNoInstalledTargetExists[\s\S]*getLastProtectionStopCode[\s\S]*getLastProtectionStopMessage[\s\S]*getLastProtectionStopAt[\s\S]*new JSONArray\(preferences\.getString\("protection_events"[\s\S]*"warning"[\s\S]*"system"/,
  'Boot recovery instrumentation must inspect disabled state, exact stop diagnostics, timestamp, and the persisted system warning event.',
);
requirePattern(
  bootRecoveryTestPath,
  bootRecoveryTest,
  /packageReplacementRecoveryAlsoFailsClosedWithoutTarget[\s\S]*ACTION_MY_PACKAGE_REPLACED[\s\S]*recovery_target_app_missing[\s\S]*protection_events/,
  'Package-replacement recovery must retain instrumentation coverage for the same fail-closed persisted warning contract.',
);

if (findings.length > 0) {
  console.log('Protection recovery check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection recovery check passed. App-open recovery preserves pending starts, routes process loss through controlled recovery, and reuses one durable config generation for safe stale-activation restart.',
);