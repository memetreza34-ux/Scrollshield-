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

function forbidPattern(key: Key, pattern: RegExp, message: string) {
  if (pattern.test(source[key])) findings.push(`${paths[key]}: ${message}`);
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
  'Presentation must distinguish pending, interrupted and confirmed process-loss states.',
);

requirePattern(
  'bridge',
  /hasNewTerminalEvidenceSince[\s\S]*status\.lastStopAt > before\.lastStopAt[\s\S]*!status\.enabled[\s\S]*status\.lastStopCode\.length > 0/,
  'Recovery must distinguish a native persisted terminal result from an unpersisted transport failure.',
);
requirePattern(
  'bridge',
  /recoverAfterProcessLoss\([\s\S]*const before = await this\.getStatus\(\)[\s\S]*before\.health !== 'unclean-process-stop'[\s\S]*const synced = await this\.syncCommitted\(appsConfig, focusMode\)[\s\S]*try \{[\s\S]*await this\.startCommitted\(synced\.configGeneration, before\)[\s\S]*catch \(error\)[\s\S]*const afterFailure = await this\.getStatus\(\)[\s\S]*hasNewTerminalEvidenceSince\(afterFailure, before\)[\s\S]*throw error[\s\S]*return this\.getStatus\(\)/,
  'Controlled process-loss recovery must route the single durable generation and lifecycle snapshot through native preflight, return fresh native terminal evidence, and rethrow failures without terminal evidence.',
);
forbidPattern(
  'bridge',
  /TARGET_APP_MISSING_STOP_REASON/,
  'Process-loss recovery must not restore the old proactive TypeScript target_app_missing stop; native snapshot-aware preflight owns fail-closed stop evidence.',
);

requirePattern(
  'bridgeTest',
  /recovers only from a confirmed unclean process stop and re-reads native truth[\s\S]*expectedRecoveryStart[\s\S]*health: 'active'/,
  'Bridge tests must cover successful snapshot-bound process-loss recovery.',
);
requirePattern(
  'bridgeTest',
  /preserves a newer manual stop that wins while process-loss recovery is in flight[\s\S]*manual_app_stop[\s\S]*stopProtectionServiceMock\)\.not\.toHaveBeenCalled/,
  'Bridge tests must prove a newer manual stop wins without a second TypeScript stop write.',
);
requirePattern(
  'bridgeTest',
  /returns fresh native target_app_missing evidence instead of writing a TypeScript stop[\s\S]*startProtectionServiceMock\.mockRejectedValueOnce[\s\S]*target_app_missing[\s\S]*stopProtectionServiceMock\)\.not\.toHaveBeenCalled/,
  'Target-app failure must come from native preflight and be read back as fresh terminal evidence.',
);
requirePattern(
  'bridgeTest',
  /rethrows a native start failure when no newer terminal evidence was persisted[\s\S]*transport failed[\s\S]*rejects\.toThrow/,
  'Transport/plugin failures without fresh terminal evidence must not be silently converted into a stopped status.',
);
requirePattern(
  'preparedStartTest',
  /forwards a lifecycle snapshot for conditional automatic restart[\s\S]*requireLifecycleSnapshot: true[\s\S]*expectedLastStartRequestAt[\s\S]*expectedLastStartAt[\s\S]*expectedLastStopAt/,
  'Prepared-start Vitest must lock lifecycle snapshot forwarding.',
);
requirePattern(
  'bridgeTest',
  /does not restart when process-loss recovery finds the service already active[\s\S]*startProtectionServiceMock\)\.not\.toHaveBeenCalled/,
  'Already-active recovery must not dispatch another start.',
);
requirePattern(
  'bridgeTest',
  /refuses process-loss recovery from an unrelated stopped state[\s\S]*rejects\.toThrow[\s\S]*unclean-process-stop/,
  'Unrelated stopped states must fail closed instead of entering process-loss recovery.',
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

if (findings.length > 0) {
  console.log('Process-loss recovery contract check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Process-loss recovery contract check passed. Automatic recovery is single-generation and lifecycle-snapshot bound; native preflight owns fail-closed evidence, newer stops win, and transport failures without fresh terminal evidence remain errors.',
);
