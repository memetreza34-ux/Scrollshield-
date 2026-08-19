import { readFile } from 'node:fs/promises';

const bridgePath = 'src/lib/nativeProtection.ts';
const bridgeTestPath = 'src/lib/nativeProtection.test.ts';
const healthPath = 'src/lib/nativeProtectionHealth.ts';
const healthTestPath = 'src/lib/nativeProtectionHealth.test.ts';
const statusPanelPath = 'src/components/NativeProtectionStatusPanel.tsx';
const statusPanelTestPath = 'src/components/NativeProtectionStatusPanel.test.tsx';
const permissionsPath = 'src/screens/PermissionsScreen.tsx';
const permissionsTestPath = 'src/screens/PermissionsScreen.test.tsx';

const [
  bridge,
  bridgeTest,
  health,
  healthTest,
  statusPanel,
  statusPanelTest,
  permissions,
  permissionsTest,
] = await Promise.all([
  readFile(bridgePath, 'utf8'),
  readFile(bridgeTestPath, 'utf8'),
  readFile(healthPath, 'utf8'),
  readFile(healthTestPath, 'utf8'),
  readFile(statusPanelPath, 'utf8'),
  readFile(statusPanelTestPath, 'utf8'),
  readFile(permissionsPath, 'utf8'),
  readFile(permissionsTestPath, 'utf8'),
]);

const findings: string[] = [];

const requirePattern = (file: string, content: string, pattern: RegExp, message: string) => {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
};

requirePattern(
  bridgePath,
  bridge,
  /NativeProtectionHealth[\s\S]*'unclean-process-stop'/,
  'Native lifecycle health must expose a dedicated unclean-process-stop state.',
);
requirePattern(
  bridgePath,
  bridge,
  /!status\.running && status\.enabled[\s\S]*status\.lastStartAt > 0[\s\S]*status\.lastStartAt > status\.lastStopAt[\s\S]*return 'unclean-process-stop'/,
  'A saved activation with no running service and a newer start than stop record must classify as an unclean process stop.',
);
requirePattern(
  bridgePath,
  bridge,
  /return 'unclean-process-stop'[\s\S]*return 'stale-activation'/,
  'Generic stale activation must remain the fallback only after the unclean-process-stop boundary is checked.',
);
requirePattern(
  healthPath,
  health,
  /case 'unclean-process-stop':[\s\S]*PROZESS ABGEBROCHEN[\s\S]*System-Kill[\s\S]*showLastStop: false/,
  'The user-facing health presentation must explain an unclean process stop without presenting an older stop record as current evidence.',
);

requirePattern(
  bridgePath,
  bridge,
  /recoverAfterProcessLoss\([\s\S]*const before = await this\.getStatus\(\)[\s\S]*before\.running && before\.enabled[\s\S]*before\.health !== 'unclean-process-stop'[\s\S]*await this\.sync\(appsConfig, focusMode\)[\s\S]*AndroidProtection\.startProtectionService\(\)[\s\S]*return this\.getStatus\(\)/,
  'Controlled process-loss recovery must re-read native truth, avoid duplicate starts, require unclean-process-stop, resync config, start through the native prerequisite gate, and re-read status afterward.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /recovers only from a confirmed unclean process stop and re-reads native truth[\s\S]*syncProtectionConfigMock[\s\S]*startProtectionServiceMock[\s\S]*health: 'active'/,
  'Bridge tests must prove controlled recovery resyncs, starts, and returns active native truth.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /does not restart when process-loss recovery finds the service already active[\s\S]*startProtectionServiceMock\)\.not\.toHaveBeenCalled/,
  'Recovery tests must protect against a duplicate service start after a concurrent recovery.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /refuses process-loss recovery from an unrelated stopped state[\s\S]*rejects\.toThrow[\s\S]*unclean-process-stop/,
  'Recovery must fail closed when the latest native state is not an unclean process stop.',
);

requirePattern(
  statusPanelPath,
  statusPanel,
  /processRecovery = status\?\.health === 'unclean-process-stop'[\s\S]*Schutz wiederherstellen[\s\S]*Wiederherstellung läuft/,
  'The status panel must expose a dedicated and observable process-loss recovery action.',
);
requirePattern(
  statusPanelTestPath,
  statusPanelTest,
  /offers a dedicated recovery action after an unclean process stop[\s\S]*Schutz wiederherstellen/,
  'Status-panel tests must cover the dedicated recovery action.',
);
requirePattern(
  statusPanelTestPath,
  statusPanelTest,
  /shows a dedicated busy label while process-loss recovery is running[\s\S]*Wiederherstellung läuft/,
  'Status-panel tests must prevent ambiguous feedback while recovery is in flight.',
);

requirePattern(
  permissionsPath,
  permissions,
  /recoveringFromProcessLoss = serviceStatus\?\.health === 'unclean-process-stop'/,
  'Permissions must derive recovery intent from the latest rendered native process-loss health state.',
);
requirePattern(
  permissionsPath,
  permissions,
  /getAndroidStatus\(\)[\s\S]*usageAccess[\s\S]*overlay[\s\S]*notifications[\s\S]*activeApps[\s\S]*recoveringFromProcessLoss[\s\S]*NativeProtection\.recoverAfterProcessLoss\([\s\S]*state\.appsConfig[\s\S]*state\.isFocusModeActive/,
  'Recovery UI must re-check critical permissions and app selection before invoking controlled recovery.',
);
requirePattern(
  permissionsPath,
  permissions,
  /nextStatus\.running && nextStatus\.enabled && nextStatus\.health === 'active'[\s\S]*wiederhergestellt[\s\S]*noch nicht als aktiv bestätigt/,
  'Recovery UI must claim success only after native status is re-read as active.',
);
requirePattern(
  permissionsTestPath,
  permissionsTest,
  /uses controlled recovery instead of the normal start path after process loss[\s\S]*recoverProtectionMock[\s\S]*startProtectionMock\)\.not\.toHaveBeenCalled[\s\S]*wiederhergestellt/,
  'Permissions integration tests must prove process loss uses recovery rather than the generic start path.',
);

requirePattern(
  bridgeTestPath,
  bridgeTest,
  /detects an unclean process stop when the last start has no later stop record[\s\S]*health: 'unclean-process-stop'/,
  'Vitest must cover process-loss detection from persisted lifecycle timestamps.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /lastStartAt: 200[\s\S]*lastStopAt: 100[\s\S]*unclean-process-stop/,
  'The deterministic lifecycle-state test must lock the lastStartAt > lastStopAt boundary.',
);
requirePattern(
  healthTestPath,
  healthTest,
  /explains an unclean process stop without trusting an older stop record[\s\S]*PROZESS ABGEBROCHEN[\s\S]*showLastStop\)\.toBe\(false\)/,
  'Presentation tests must prove older stop evidence is hidden for an unclean process stop.',
);

if (findings.length > 0) {
  console.log('Process-loss recovery contract check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Process-loss recovery contract check passed. Unclean process loss is detected separately and can only use controlled, prerequisite-checked, status-verified restart recovery.',
);
