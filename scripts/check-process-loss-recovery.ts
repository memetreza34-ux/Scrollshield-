import { readFile } from 'node:fs/promises';

const bridgePath = 'src/lib/nativeProtection.ts';
const bridgeTestPath = 'src/lib/nativeProtection.test.ts';
const healthPath = 'src/lib/nativeProtectionHealth.ts';
const healthTestPath = 'src/lib/nativeProtectionHealth.test.ts';
const statusPanelPath = 'src/components/NativeProtectionStatusPanel.tsx';
const statusPanelTestPath = 'src/components/NativeProtectionStatusPanel.test.tsx';
const prerequisitePolicyPath = 'src/lib/androidProtectionPrerequisites.ts';
const prerequisitePolicyTestPath = 'src/lib/androidProtectionPrerequisites.test.ts';
const permissionsPath = 'src/screens/PermissionsScreen.tsx';
const permissionsTestPath = 'src/screens/PermissionsScreen.test.tsx';

const [
  bridge,
  bridgeTest,
  health,
  healthTest,
  statusPanel,
  statusPanelTest,
  prerequisitePolicy,
  prerequisitePolicyTest,
  permissions,
  permissionsTest,
] = await Promise.all([
  readFile(bridgePath, 'utf8'),
  readFile(bridgeTestPath, 'utf8'),
  readFile(healthPath, 'utf8'),
  readFile(healthTestPath, 'utf8'),
  readFile(statusPanelPath, 'utf8'),
  readFile(statusPanelTestPath, 'utf8'),
  readFile(prerequisitePolicyPath, 'utf8'),
  readFile(prerequisitePolicyTestPath, 'utf8'),
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
  bridgePath,
  bridge,
  /TARGET_APP_MISSING_STOP_REASON[\s\S]*code: 'target_app_missing'/,
  'Process-loss recovery must use the stable target_app_missing stop code when no active installed target remains.',
);
requirePattern(
  bridgePath,
  bridge,
  /activeAndroidAppIds[\s\S]*unavailableAppIds = await this\.sync\(appsConfig, focusMode\)[\s\S]*activeAndroidAppIds\.length === 0[\s\S]*activeAndroidAppIds\.every\(\(appId\) => unavailableAppIds\.includes\(appId\)\)[\s\S]*await this\.stop\(TARGET_APP_MISSING_STOP_REASON\)[\s\S]*return this\.getStatus\(\)[\s\S]*AndroidProtection\.startProtectionService\(\)/,
  'Recovery must fail closed before service start when every active Android target is unavailable, then persist target_app_missing and re-read status.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /fails closed with target_app_missing when every active Android target is unavailable[\s\S]*unavailableAppIdsJson: '\["instagram"\]'[\s\S]*startProtectionServiceMock\)\.not\.toHaveBeenCalled[\s\S]*reasonCode: 'target_app_missing'[\s\S]*health: 'stopped-with-reason'/,
  'Bridge tests must prove all unavailable active targets block recovery without starting the service.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /still recovers when one active target is unavailable but another remains installed[\s\S]*instagram[\s\S]*tiktok[\s\S]*stopProtectionServiceMock\)\.not\.toHaveBeenCalled[\s\S]*startProtectionServiceMock\)\.toHaveBeenCalledTimes\(1\)/,
  'Bridge tests must prove partial target unavailability does not block protection for remaining installed active apps.',
);
requirePattern(
  healthPath,
  health,
  /lastStopCode === 'target_app_missing'[\s\S]*ZIEL-APP FEHLT[\s\S]*Keine installierte Ziel-App verfügbar[\s\S]*mindestens eine installierte App/,
  'Persisted target_app_missing status must render a dedicated target-app recovery blocker.',
);
requirePattern(
  healthTestPath,
  healthTest,
  /shows an explicit target-app blocker after recovery cannot find any installed active target[\s\S]*target_app_missing[\s\S]*ZIEL-APP FEHLT[\s\S]*mindestens eine installierte App/,
  'Presentation tests must lock the dedicated target-app recovery message.',
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
  prerequisitePolicyPath,
  prerequisitePolicy,
  /REQUIRED_PREREQUISITES[\s\S]*'usageAccess'[\s\S]*'overlay'[\s\S]*'notifications'/,
  'Android prerequisite policy must keep a stable required-access order.',
);
requirePattern(
  prerequisitePolicyPath,
  prerequisitePolicy,
  /usage_access_missing: 'usageAccess'[\s\S]*overlay_permission_missing: 'overlay'[\s\S]*notifications_missing: 'notifications'/,
  'Stable native permission-loss stop codes must map back to the same UI prerequisite keys.',
);
requirePattern(
  prerequisitePolicyPath,
  prerequisitePolicy,
  /getMissingAndroidProtectionPrerequisites[\s\S]*status\[key\] !== true/,
  'Prerequisite evaluation must fail closed for every required access that is not explicitly true.',
);
requirePattern(
  prerequisitePolicyTestPath,
  prerequisitePolicyTest,
  /returns missing prerequisites in a stable user-facing order[\s\S]*usageAccess[\s\S]*overlay[\s\S]*notifications/,
  'Prerequisite policy tests must lock missing-access ordering and labels.',
);
requirePattern(
  prerequisitePolicyTestPath,
  prerequisitePolicyTest,
  /maps stable native prerequisite stop codes back to the same UI prerequisite keys[\s\S]*usage_access_missing[\s\S]*overlay_permission_missing[\s\S]*notifications_missing/,
  'Prerequisite policy tests must lock native stop-code mapping.',
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
  /const nativeStatus = await NativePermissions\.getAndroidStatus\(\)[\s\S]*applyNativePermissionStatus\(nativeStatus\)[\s\S]*getMissingAndroidProtectionPrerequisites\(nativeStatus\)[\s\S]*describeProtectionPrerequisiteBlock/,
  'Recovery/start preflight must refresh native permission truth, update visible state, and name exact blockers.',
);
requirePattern(
  permissionsPath,
  permissions,
  /activeApps[\s\S]*recoveringFromProcessLoss[\s\S]*NativeProtection\.recoverAfterProcessLoss\([\s\S]*state\.appsConfig[\s\S]*state\.isFocusModeActive/,
  'Recovery UI must require app selection before invoking controlled recovery.',
);
requirePattern(
  permissionsPath,
  permissions,
  /nextStatus\.running && nextStatus\.enabled && nextStatus\.health === 'active'[\s\S]*wiederhergestellt/,
  'Recovery UI must claim success only after native status is re-read as active.',
);
requirePattern(
  permissionsPath,
  permissions,
  /getAndroidProtectionPrerequisiteForStopCode\(nextStatus\.lastStopCode\)[\s\S]*describeProtectionPrerequisiteBlock\(\[blockedPrerequisite\], true\)/,
  'A service that immediately stops with a stable prerequisite code must surface the exact recovery blocker.',
);
requirePattern(
  permissionsPath,
  permissions,
  /catch \(error\)[\s\S]*Promise\.all\(\[[\s\S]*NativePermissions\.getAndroidStatus\(\)[\s\S]*NativeProtection\.getStatus\(\)[\s\S]*getMissingAndroidProtectionPrerequisites\(latestPermissions\)[\s\S]*getAndroidProtectionPrerequisiteForStopCode/,
  'Recovery errors must re-read both permissions and service diagnostics to close permission-loss races.',
);
requirePattern(
  permissionsTestPath,
  permissionsTest,
  /uses controlled recovery instead of the normal start path after process loss[\s\S]*recoverProtectionMock[\s\S]*startProtectionMock\)\.not\.toHaveBeenCalled[\s\S]*wiederhergestellt/,
  'Permissions integration tests must prove process loss uses recovery rather than the generic start path.',
);
requirePattern(
  permissionsTestPath,
  permissionsTest,
  /names the exact missing permission before process-loss recovery starts[\s\S]*App-Nutzungszugriff fehlt[\s\S]*recoverProtectionMock\)\.not\.toHaveBeenCalled/,
  'Permissions tests must prove a missing prerequisite blocks recovery before native start.',
);
requirePattern(
  permissionsTestPath,
  permissionsTest,
  /rechecks Android permissions after a recovery error to diagnose a permission race[\s\S]*overlay: false[\s\S]*Hinweis über anderen Apps fehlt/,
  'Permissions tests must cover permission revocation between preflight and recovery failure handling.',
);
requirePattern(
  permissionsTestPath,
  permissionsTest,
  /maps a fresh native prerequisite stop code to an exact recovery blocker[\s\S]*notifications_missing[\s\S]*Benachrichtigungsfreigabe fehlt/,
  'Permissions tests must cover stable native stop-code diagnostics after an accepted recovery start.',
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
  'Process-loss recovery contract check passed. Unclean process loss is detected separately; recovery names exact permission blockers and fails closed with target_app_missing when no installed active Android target remains.',
);
