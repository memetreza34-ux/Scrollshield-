import { readFile } from 'node:fs/promises';

const appPath = 'src/App.tsx';
const policyPath = 'src/lib/protectionRecovery.ts';
const policyTestPath = 'src/lib/protectionRecovery.test.ts';
const appTestPath = 'src/App.protectionRecovery.test.tsx';
const preparedStartTestPath = 'src/lib/nativeProtectionPreparedStart.test.ts';
const pluginPath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldNativePlugin.java';
const bootReceiverPath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldBootReceiver.java';
const bootRecoveryTestPath =
  'android/app/src/androidTest/java/app/scrollshield/mobile/BootRecoveryInstrumentedTest.java';

const [app, policy, policyTest, appTest, preparedStartTest, plugin, bootReceiver, bootRecoveryTest] =
  await Promise.all([
    readFile(appPath, 'utf8'),
    readFile(policyPath, 'utf8'),
    readFile(policyTestPath, 'utf8'),
    readFile(appTestPath, 'utf8'),
    readFile(preparedStartTestPath, 'utf8'),
    readFile(pluginPath, 'utf8'),
    readFile(bootReceiverPath, 'utf8'),
    readFile(bootRecoveryTestPath, 'utf8'),
  ]);

const findings: string[] = [];
function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
}
function forbidText(file: string, content: string, text: string, message: string) {
  if (content.includes(text)) findings.push(`${file}: ${message}`);
}

requirePattern(
  policyPath,
  policy,
  /status\.enabled[\s\S]*!status\.running[\s\S]*status\.health === 'stale-activation'/,
  'Generic app-open restart must be limited to stale activation lifecycle truth.',
);
forbidText(
  policyPath,
  policy,
  'installedActiveAppIds.length > 0',
  'React recovery policy must not suppress stale recovery based on target availability; native preflight owns target evidence.',
);
requirePattern(
  policyTestPath,
  policyTest,
  /attempts automatic restart only for stale activation and delegates target availability to native[\s\S]*stale-activation[\s\S]*\[\][\s\S]*toBe\(true\)[\s\S]*unclean-process-stop[\s\S]*start-pending[\s\S]*start-interrupted/,
  'Recovery policy tests must prove target availability cannot bypass native stale-recovery preflight.',
);

requirePattern(
  appPath,
  app,
  /NativeProtection\.getStatus\(\)[\s\S]*serviceStatus\.health === 'start-pending'[\s\S]*setTimeout\([\s\S]*syncAndRecoverProtection/,
  'App-open must inspect native lifecycle truth first and defer while confirmation is pending.',
);
requirePattern(
  appPath,
  app,
  /serviceStatus\.health === 'unclean-process-stop'[\s\S]*recoverAfterProcessLoss\([\s\S]*return;[\s\S]*NativeProtection\.syncCommitted\([\s\S]*shouldRecoverStaleProtection\(serviceStatus, installedActiveAppIds\)[\s\S]*NativeProtection\.startCommitted\(synced\.configGeneration, serviceStatus\)/,
  'Process loss must route directly to controlled recovery; stale activation must always reach the snapshot-bound native preflight after one durable sync.',
);
requirePattern(
  appTestPath,
  appTest,
  /restarts a stale service with the single durable generation and exact lifecycle snapshot[\s\S]*startCommittedMock[\s\S]*CONFIG_GENERATION[\s\S]*lastStartRequestAt: 0[\s\S]*lastStartAt: 1[\s\S]*lastStopAt: 0[\s\S]*syncCommittedMock\)\.toHaveBeenCalledTimes\(1\)/,
  'App integration test must prove single-generation stale restart with exact lifecycle snapshot.',
);
requirePattern(
  appTestPath,
  appTest,
  /delegates unavailable-target stale recovery to the native snapshot-bound preflight[\s\S]*unavailableAppIds: \['instagram'\][\s\S]*startCommittedMock\)\.toHaveBeenCalledWith[\s\S]*CONFIG_GENERATION[\s\S]*health: 'stale-activation'/,
  'App integration test must prove unavailable targets do not suppress native stale-recovery preflight.',
);
requirePattern(
  appTestPath,
  appTest,
  /uses controlled process-loss recovery without a duplicate app-level config sync[\s\S]*recoverMock\)\.toHaveBeenCalled[\s\S]*syncCommittedMock\)\.not\.toHaveBeenCalled/,
  'App-open process loss must not perform a redundant generic config sync.',
);
requirePattern(
  appTestPath,
  appTest,
  /does not invalidate a fresh pending start request with config sync or a duplicate start[\s\S]*syncCommittedMock\)\.not\.toHaveBeenCalled[\s\S]*startCommittedMock\)\.not\.toHaveBeenCalled/,
  'Fresh pending start must not be invalidated by app-open sync/start.',
);

requirePattern(
  preparedStartTestPath,
  preparedStartTest,
  /starts an already committed generation without performing a second config sync[\s\S]*forwards a lifecycle snapshot for conditional automatic restart[\s\S]*requireLifecycleSnapshot: true[\s\S]*fails closed before Android dispatch when automatic restart snapshot is invalid/,
  'Prepared-start tests must cover generation reuse, snapshot forwarding and invalid-snapshot fail-closed behavior.',
);
requirePattern(
  pluginPath,
  plugin,
  /requireLifecycleSnapshot[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*synchronized \(EVENT_LOCK\)[\s\S]*matchesLifecycleSnapshot[\s\S]*call\.resolve\(\);[\s\S]*return;[\s\S]*matchesCurrentGeneration[\s\S]*hasUsageAccess[\s\S]*canDrawOverlays[\s\S]*hasNotificationsEnabled[\s\S]*hasConfiguredApps[\s\S]*TARGET_APP_MISSING[\s\S]*recordProtectionStartRequested/,
  'Native automatic restart must check snapshot first, then own config/permission/target fail-closed evidence before request persistence.',
);

requirePattern(
  bootReceiverPath,
  bootReceiver,
  /BOOT_COMPLETED|MY_PACKAGE_REPLACED|ACTION_LOCKED_BOOT_COMPLETED|PACKAGE_REPLACED|recovery_/,
  'Boot/update recovery must remain present alongside app-open recovery.',
);
requirePattern(
  bootReceiverPath,
  bootReceiver,
  /stopRecoveryLocked[\s\S]*persistProtectionSystemStopWithFallback[\s\S]*dispatchControlledStop/,
  'Boot/update recovery failure must keep atomic evidence plus controlled stop dispatch.',
);
requirePattern(
  bootRecoveryTestPath,
  bootRecoveryTest,
  /bootRecoveryFailsClosedWhenNoInstalledTargetExists[\s\S]*getLastProtectionStopCode[\s\S]*protection_events/,
  'Boot recovery instrumentation must retain persisted fail-closed target evidence.',
);

if (findings.length > 0) {
  console.log('Protection recovery check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection recovery check passed. Pending starts remain untouched; stale/process-loss auto recovery reaches one snapshot-bound native preflight, and native owns current config/permission/target fail-closed evidence.',
);