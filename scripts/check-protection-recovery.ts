import { readFile } from 'node:fs/promises';

const appPath = 'src/App.tsx';
const policyPath = 'src/lib/protectionRecovery.ts';
const policyTestPath = 'src/lib/protectionRecovery.test.ts';
const appTestPath = 'src/App.protectionRecovery.test.tsx';
const bootReceiverPath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldBootReceiver.java';
const pluginPath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldNativePlugin.java';
const bootRecoveryTestPath =
  'android/app/src/androidTest/java/app/scrollshield/mobile/BootRecoveryInstrumentedTest.java';

const [app, policy, policyTest, appTest, bootReceiver, plugin, bootRecoveryTest] = await Promise.all([
  readFile(appPath, 'utf8'),
  readFile(policyPath, 'utf8'),
  readFile(policyTestPath, 'utf8'),
  readFile(appTestPath, 'utf8'),
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
  /status\.enabled && !status\.running && installedActiveAppIds\.length > 0/,
  'Recovery must only restart a previously enabled stale service.',
);
requirePattern(
  policyTestPath,
  policyTest,
  /active installed target ids[\s\S]*previously enabled but stopped service[\s\S]*enabled: false[\s\S]*running: true[\s\S]*\[\]/,
  'Recovery policy tests must cover active, disabled, already-running, and unavailable-target cases.',
);
requirePattern(
  appPath,
  app,
  /NativeProtection\.sync[\s\S]*NativeProtection\.getStatus[\s\S]*getInstalledActiveProtectionIds[\s\S]*shouldRecoverStaleProtection[\s\S]*NativeProtection\.start/,
  'App startup/config sync must inspect and recover a stale previously-enabled service.',
);
requirePattern(
  appTestPath,
  appTest,
  /restarts a previously enabled stale service[\s\S]*never automatically enables protection that was deliberately disabled[\s\S]*does not restart when every configured active target is unavailable/,
  'App integration tests must guard every automatic-recovery boundary.',
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
  /private void stopRecovery\([\s\S]*persistProtectionSystemStopWithFallback\(context, code, message\)/,
  'Boot/update recovery failures must delegate to the shared atomic system-stop wrapper.',
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
  'Protection recovery check passed. Boot/update recovery delegates to the shared atomic system-stop transaction, while app-open stale-service recovery remains fail-closed and target-aware.',
);
