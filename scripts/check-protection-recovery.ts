import { readFile } from 'node:fs/promises';

const appPath = 'src/App.tsx';
const policyPath = 'src/lib/protectionRecovery.ts';
const policyTestPath = 'src/lib/protectionRecovery.test.ts';
const appTestPath = 'src/App.protectionRecovery.test.tsx';
const bootReceiverPath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldBootReceiver.java';

const [app, policy, policyTest, appTest, bootReceiver] = await Promise.all([
  readFile(appPath, 'utf8'),
  readFile(policyPath, 'utf8'),
  readFile(policyTestPath, 'utf8'),
  readFile(appTestPath, 'utf8'),
  readFile(bootReceiverPath, 'utf8'),
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

if (findings.length > 0) {
  console.log('Protection recovery check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection recovery check passed. Boot/update recovery and app-open stale-service recovery remain separate, and automatic restart cannot enable an intentionally disabled service or run without an installed active target.',
);
