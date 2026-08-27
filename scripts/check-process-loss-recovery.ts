import { readFile } from 'node:fs/promises';

const paths = {
  bridge: 'src/lib/nativeProtection.ts',
  bridgeTest: 'src/lib/nativeProtection.test.ts',
  preparedStartTest: 'src/lib/nativeProtectionPreparedStart.test.ts',
  health: 'src/lib/nativeProtectionHealth.ts',
  healthTest: 'src/lib/nativeProtectionHealth.test.ts',
  statusPanel: 'src/components/NativeProtectionStatusPanel.tsx',
  statusPanelTest: 'src/components/NativeProtectionStatusPanel.test.tsx',
  prerequisites: 'src/lib/androidProtectionPrerequisites.ts',
  permissions: 'src/screens/PermissionsScreen.tsx',
  permissionsTest: 'src/screens/PermissionsScreen.test.tsx',
} as const;

type Key = keyof typeof paths;
const entries = await Promise.all(
  Object.entries(paths).map(async ([key, file]) => [key, await readFile(file, 'utf8')] as const),
);
const source = Object.fromEntries(entries) as Record<Key, string>;
const findings: string[] = [];
function requirePattern(key: Key, pattern: RegExp, message: string) {
  if (!pattern.test(source[key])) findings.push(`${paths[key]}: ${message}`);
}

requirePattern(
  'bridge',
  /NativeProtectionHealth[\s\S]*'start-pending'[\s\S]*'start-interrupted'[\s\S]*'unclean-process-stop'/,
  'Native health must keep pending/interrupted starts separate from confirmed process loss.',
);
requirePattern(
  'bridge',
  /lastStartRequestAt > latestConfirmedBoundary[\s\S]*return 'start-pending'[\s\S]*return 'start-interrupted'[\s\S]*lastStartAt > 0[\s\S]*lastStartAt > status\.lastStopAt[\s\S]*return 'unclean-process-stop'/,
  'Unconfirmed request classification must precede confirmed process-loss classification.',
);
requirePattern(
  'health',
  /case 'start-pending':[\s\S]*STARTET[\s\S]*case 'start-interrupted':[\s\S]*START ABGEBROCHEN[\s\S]*case 'unclean-process-stop':[\s\S]*PROZESS ABGEBROCHEN/,
  'Presentation must distinguish the three lifecycle states.',
);

requirePattern(
  'bridge',
  /recoverAfterProcessLoss\([\s\S]*const before = await this\.getStatus\(\)[\s\S]*before\.health !== 'unclean-process-stop'[\s\S]*const synced = await this\.syncCommitted\(appsConfig, focusMode\)[\s\S]*await this\.startCommitted\(synced\.configGeneration, before\)[\s\S]*return this\.getStatus\(\)/,
  'Controlled process-loss recovery must use the exact durable config generation and the lifecycle snapshot that justified recovery.',
);
requirePattern(
  'bridgeTest',
  bridgeTestSnapshotPattern(),
  'Bridge process-loss test must forward enabled/start-request/start/stop snapshot evidence to native start.',
);
requirePattern(
  'preparedStartTest',
  /forwards a lifecycle snapshot for conditional automatic restart[\s\S]*requireLifecycleSnapshot: true[\s\S]*expectedLastStartRequestAt[\s\S]*expectedLastStartAt[\s\S]*expectedLastStopAt/,
  'Prepared-start Vitest must lock snapshot forwarding.',
);
requirePattern(
  'bridgeTest',
  /does not restart when process-loss recovery finds the service already active[\s\S]*startProtectionServiceMock\)\.not\.toHaveBeenCalled/,
  'Concurrent already-active recovery must not dispatch another start.',
);
requirePattern(
  'bridgeTest',
  /refuses process-loss recovery from an unrelated stopped state[\s\S]*rejects\.toThrow[\s\S]*unclean-process-stop/,
  'Unrelated stopped states must fail closed instead of entering process-loss recovery.',
);
requirePattern(
  'bridge',
  /TARGET_APP_MISSING_STOP_REASON[\s\S]*activeAndroidAppIds[\s\S]*synced\.unavailableAppIds[\s\S]*this\.stop\(TARGET_APP_MISSING_STOP_REASON\)/,
  'Process-loss recovery must fail closed when no installed active target remains.',
);

requirePattern(
  'statusPanel',
  /processRecovery = status\?\.health === 'unclean-process-stop'[\s\S]*startPending = status\?\.health === 'start-pending'[\s\S]*startRetry = status\?\.health === 'start-interrupted'/,
  'Status panel must keep process recovery, pending and retry actions separate.',
);
requirePattern(
  'statusPanelTest',
  /offers a dedicated recovery action after an unclean process stop[\s\S]*shows a dedicated busy label while process-loss recovery is running/,
  'Status-panel tests must retain dedicated process-loss recovery feedback.',
);
requirePattern(
  'prerequisites',
  /usage_access_missing: 'usageAccess'[\s\S]*overlay_permission_missing: 'overlay'[\s\S]*notifications_missing: 'notifications'/,
  'Stable native prerequisite stop codes must remain mapped to UI prerequisite keys.',
);
requirePattern(
  'permissions',
  /recoveringFromProcessLoss = serviceStatus\?\.health === 'unclean-process-stop'[\s\S]*NativeProtection\.recoverAfterProcessLoss/,
  'Permissions UI must use controlled recovery only for confirmed process loss.',
);
requirePattern(
  'permissionsTest',
  /uses controlled recovery instead of the normal start path after process loss[\s\S]*startProtectionMock\)\.not\.toHaveBeenCalled/,
  'Permissions tests must prevent generic start during process-loss recovery.',
);
requirePattern(
  'bridgeTest',
  /detects a pending start request during the confirmation grace window[\s\S]*detects an interrupted start request after the confirmation grace window[\s\S]*detects an unclean process stop when the last confirmed start has no later stop record/,
  'Vitest must retain pending, interrupted and confirmed process-loss classification coverage.',
);
requirePattern(
  'healthTest',
  /explains an unclean process stop without trusting an older stop record/,
  'Presentation tests must not expose stale stop evidence as the current process-loss reason.',
);

function bridgeTestSnapshotPattern(): RegExp {
  return /recovers only from a confirmed unclean process stop and re-reads native truth[\s\S]*expectedConfigGeneration: CONFIG_GENERATION[\s\S]*requireLifecycleSnapshot: true[\s\S]*expectedEnabled: true[\s\S]*expectedLastStartRequestAt: 150[\s\S]*expectedLastStartAt: 200[\s\S]*expectedLastStopAt: 100/;
}

if (findings.length > 0) {
  console.log('Process-loss recovery contract check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Process-loss recovery contract check passed. Pending/interrupted starts remain distinct; automatic recovery is config-generation and lifecycle-snapshot bound so newer stop evidence wins.',
);