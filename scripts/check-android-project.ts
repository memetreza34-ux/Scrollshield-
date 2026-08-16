import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type Finding = {
  file: string;
  text: string;
};

const findings: Finding[] = [];
const androidDir = 'android';

function requireMatch(file: string, content: string, pattern: RegExp, text: string) {
  if (pattern.test(content)) return;
  findings.push({ file, text });
}

function requireNumberAtLeast(file: string, label: string, value: number | undefined, min: number) {
  if (value !== undefined && value >= min) return;
  findings.push({ file, text: `${label} must be at least ${min}; found ${value ?? 'missing'}.` });
}

if (!existsSync(androidDir)) {
  console.log('Android project check skipped: android project absent.');
  process.exit(0);
}

const buildGradlePath = path.join(androidDir, 'app', 'build.gradle');
const variablesGradlePath = path.join(androidDir, 'variables.gradle');
const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
const javaRoot = path.join(androidDir, 'app', 'src', 'main', 'java', 'app', 'scrollshield', 'mobile');
const javaTestRoot = path.join(androidDir, 'app', 'src', 'test', 'java', 'app', 'scrollshield', 'mobile');
const mainActivityPath = path.join(javaRoot, 'MainActivity.java');
const pluginPath = path.join(javaRoot, 'ScrollShieldNativePlugin.java');
const diagnosticsPluginPath = path.join(javaRoot, 'ScrollShieldDiagnosticsPlugin.java');
const servicePath = path.join(javaRoot, 'ScrollShieldProtectionService.java');
const bootReceiverPath = path.join(javaRoot, 'ScrollShieldBootReceiver.java');
const rulePolicyPath = path.join(javaRoot, 'ProtectionRulePolicy.java');
const rulePolicyTestPath = path.join(javaTestRoot, 'ProtectionRulePolicyTest.java');
const workflowPath = path.join('.github', 'workflows', 'verify.yml');

const buildGradle = await readFile(buildGradlePath, 'utf8');
const variablesGradle = await readFile(variablesGradlePath, 'utf8');
const manifest = await readFile(manifestPath, 'utf8');
const mainActivity = await readFile(mainActivityPath, 'utf8');
const plugin = await readFile(pluginPath, 'utf8');
const diagnosticsPlugin = await readFile(diagnosticsPluginPath, 'utf8');
const service = await readFile(servicePath, 'utf8');
const bootReceiver = await readFile(bootReceiverPath, 'utf8');
const rulePolicy = await readFile(rulePolicyPath, 'utf8');
const rulePolicyTest = await readFile(rulePolicyTestPath, 'utf8');
const workflow = await readFile(workflowPath, 'utf8');

const minSdk = Number(variablesGradle.match(/minSdkVersion\s*=\s*(\d+)/)?.[1]);
const compileSdk = Number(variablesGradle.match(/compileSdkVersion\s*=\s*(\d+)/)?.[1]);
const targetSdk = Number(variablesGradle.match(/targetSdkVersion\s*=\s*(\d+)/)?.[1]);
const versionCode = Number(buildGradle.match(/versionCode\s+(\d+)/)?.[1]);

requireNumberAtLeast(variablesGradlePath, 'minSdkVersion', Number.isFinite(minSdk) ? minSdk : undefined, 24);
requireNumberAtLeast(
  variablesGradlePath,
  'compileSdkVersion',
  Number.isFinite(compileSdk) ? compileSdk : undefined,
  35,
);
requireNumberAtLeast(variablesGradlePath, 'targetSdkVersion', Number.isFinite(targetSdk) ? targetSdk : undefined, 35);
requireNumberAtLeast(buildGradlePath, 'versionCode', Number.isFinite(versionCode) ? versionCode : undefined, 1);

if (Number.isFinite(compileSdk) && Number.isFinite(targetSdk) && compileSdk < targetSdk) {
  findings.push({
    file: variablesGradlePath,
    text: `compileSdkVersion (${compileSdk}) must be greater than or equal to targetSdkVersion (${targetSdk}).`,
  });
}

requireMatch(
  buildGradlePath,
  buildGradle,
  /namespace\s*=\s*"app\.scrollshield\.mobile"/,
  'Unexpected Android namespace.',
);
requireMatch(
  buildGradlePath,
  buildGradle,
  /applicationId\s+"app\.scrollshield\.mobile"/,
  'Unexpected Android applicationId.',
);
requireMatch(buildGradlePath, buildGradle, /minifyEnabled\s+true/, 'Release build must keep minifyEnabled true.');
requireMatch(buildGradlePath, buildGradle, /shrinkResources\s+true/, 'Release build must keep shrinkResources true.');
requireMatch(
  buildGradlePath,
  buildGradle,
  /signingPropertiesFile\.exists\(\)/,
  'Release signing must stay opt-in through ignored local signing.properties.',
);

requireMatch(manifestPath, manifest, /android:allowBackup="false"/, 'Android app backup must stay disabled.');
requireMatch(manifestPath, manifest, /android:usesCleartextTraffic="false"/, 'Cleartext HTTP must stay disabled.');
requireMatch(manifestPath, manifest, /android:exported="true"/, 'Launcher activity must explicitly declare exported.');
requireMatch(
  manifestPath,
  manifest,
  /android:name="\.ScrollShieldProtectionService"/,
  'Android protection service must stay registered.',
);
requireMatch(
  manifestPath,
  manifest,
  /android:foregroundServiceType="specialUse"/,
  'Android protection service must declare its foreground service type.',
);
requireMatch(
  manifestPath,
  manifest,
  /android:name="\.ScrollShieldBootReceiver"/,
  'Android boot recovery receiver must stay registered.',
);
requireMatch(
  manifestPath,
  manifest,
  /android\.intent\.action\.BOOT_COMPLETED/,
  'Android boot recovery receiver must listen for BOOT_COMPLETED.',
);
requireMatch(
  manifestPath,
  manifest,
  /<queries>[\s\S]*com\.instagram\.android[\s\S]*com\.google\.android\.youtube[\s\S]*<\/queries>/,
  'Android package visibility queries must include supported protected apps.',
);

requireMatch(
  mainActivityPath,
  mainActivity,
  /registerPlugin\(ScrollShieldNativePlugin\.class\)/,
  'MainActivity must register the native protection bridge.',
);
requireMatch(
  mainActivityPath,
  mainActivity,
  /registerPlugin\(ScrollShieldDiagnosticsPlugin\.class\)/,
  'MainActivity must register the native diagnostics bridge.',
);

requireMatch(
  pluginPath,
  plugin,
  /setProtectionEnabled\(context, true\)/,
  'Starting native protection must persist explicit user activation.',
);
requireMatch(
  pluginPath,
  plugin,
  /setProtectionEnabled\(context, false\)/,
  'Stopping native protection must clear persisted user activation.',
);
requireMatch(
  pluginPath,
  plugin,
  /hasInstalledPackage\(context, packages\)/,
  'Native protection must validate supported installed packages.',
);
requireMatch(
  pluginPath,
  plugin,
  /drainProtectionEvents/,
  'Native events and measured usage must remain drainable into React state.',
);

requireMatch(
  diagnosticsPluginPath,
  diagnosticsPlugin,
  /@CapacitorPlugin\(name = "ScrollShieldDiagnostics"\)/,
  'Android diagnostics must remain available through a dedicated Capacitor plugin.',
);
requireMatch(
  diagnosticsPluginPath,
  diagnosticsPlugin,
  /manufacturer[\s\S]*model[\s\S]*androidRelease[\s\S]*sdkInt[\s\S]*timeZone/,
  'Android diagnostics must include device, OS, and time-zone identity.',
);
requireMatch(
  diagnosticsPluginPath,
  diagnosticsPlugin,
  /usageAccess[\s\S]*overlay[\s\S]*batteryOptimizationExempt[\s\S]*protectionEnabled[\s\S]*serviceRunning/,
  'Android diagnostics must include permission and service health.',
);

requireMatch(
  servicePath,
  service,
  /ACTION_STOP/,
  'The foreground-service notification must keep a direct stop action.',
);
requireMatch(
  servicePath,
  service,
  /ProtectionRulePolicy\.getScheduledAction/,
  'Native schedule enforcement must execute the JUnit-tested rule policy.',
);
requireMatch(
  servicePath,
  service,
  /ProtectionRulePolicy\.isDailyLimitReached[\s\S]*getDailyUsageMs/,
  'Native daily-limit enforcement must execute the JUnit-tested rule policy.',
);
requireMatch(
  servicePath,
  service,
  /ProtectionRulePolicy\.isInsideBlockedHours/,
  'Native blocked-hour enforcement must execute the JUnit-tested rule policy.',
);
requireMatch(
  servicePath,
  service,
  /ProtectionRulePolicy\.isAntiBingeBlocked[\s\S]*ProtectionRulePolicy\.isAntiBingeWarning/,
  'Native Anti-Binge enforcement must execute the JUnit-tested rule policy.',
);
requireMatch(
  servicePath,
  service,
  /ProtectionRulePolicy\.hasEmergencyAvailable/,
  'Native emergency-unlock enforcement must execute the JUnit-tested rule policy.',
);
requireMatch(
  servicePath,
  service,
  /CONFIGURATION_HEALTH_INTERVAL_MS[\s\S]*hasConfiguredApps\(this\)/,
  'The running service must periodically stop after protected apps are removed or become unavailable.',
);
requireMatch(
  servicePath,
  service,
  /hasActiveConfiguredRule[\s\S]*Keine aktive Schutzregel/,
  'The running service must stop when all protection rules are disabled.',
);
requireMatch(
  servicePath,
  service,
  /hasNotificationsEnabled\(this\)[\s\S]*nicht unsichtbar läuft/,
  'The running service must stop when notification visibility is revoked.',
);
requireMatch(
  servicePath,
  service,
  /stopForeground\(STOP_FOREGROUND_REMOVE\)[\s\S]*stopForeground\(true\)/,
  'Service shutdown must explicitly remove the foreground notification.',
);
requireMatch(
  servicePath,
  service,
  /stopForMissingPermission/,
  'Native protection must clear explicit activation and record a warning when a required condition disappears.',
);

requireMatch(
  bootReceiverPath,
  bootReceiver,
  /isProtectionEnabled\(context\)/,
  'Boot recovery must require prior explicit user activation.',
);
requireMatch(
  bootReceiverPath,
  bootReceiver,
  /hasUsageAccess\(context\)/,
  'Boot recovery must re-check Usage Access before starting protection.',
);
requireMatch(
  bootReceiverPath,
  bootReceiver,
  /hasNotificationsEnabled\(context\)/,
  'Boot recovery must re-check visible notifications before starting protection.',
);

requireMatch(
  rulePolicyPath,
  rulePolicy,
  /getScheduledAction[\s\S]*weekend[\s\S]*nightAction[\s\S]*morningAction[\s\S]*workAction[\s\S]*eveningAction/,
  'The deterministic rule policy must keep explicit weekly-window precedence.',
);
requireMatch(
  rulePolicyPath,
  rulePolicy,
  /isInsideBlockedHours/,
  'The deterministic rule policy must keep blocked-hour parsing.',
);
requireMatch(
  rulePolicyPath,
  rulePolicy,
  /isDailyLimitReached/,
  'The deterministic rule policy must keep exact daily-limit checks.',
);
requireMatch(
  rulePolicyPath,
  rulePolicy,
  /hasEmergencyAvailable/,
  'The deterministic rule policy must keep emergency-limit checks.',
);

requireMatch(
  rulePolicyTestPath,
  rulePolicyTest,
  /appliesWeekdayTimeBoundariesWithoutGaps/,
  'Android local tests must cover recurring schedule boundaries.',
);
requireMatch(
  rulePolicyTestPath,
  rulePolicyTest,
  /overnightBlockedRangeIncludesBothSidesOfMidnight/,
  'Android local tests must cover ranges crossing midnight.',
);
requireMatch(
  rulePolicyTestPath,
  rulePolicyTest,
  /dailyLimitIsDisabledAtZeroAndTriggersAtExactBoundary/,
  'Android local tests must cover exact daily-limit boundaries.',
);
requireMatch(
  rulePolicyTestPath,
  rulePolicyTest,
  /emergencyLimitIsStrictlyLessThanDailyMaximum/,
  'Android local tests must cover daily emergency limits.',
);

const actionUseLines = workflow.split(/\r?\n/).filter((line) => /^\s*uses:\s*/.test(line));
for (const line of actionUseLines) {
  if (/^\s*uses:\s*[^@\s]+@[0-9a-f]{40}(?:\s+#\s*\S+)?\s*$/.test(line)) continue;
  findings.push({
    file: workflowPath,
    text: `External GitHub Action must use an immutable 40-character commit SHA: ${line.trim()}`,
  });
}

requireMatch(
  workflowPath,
  workflow,
  /actions\/setup-java@[0-9a-f]{40}\s+# v5/,
  'Verify workflow must configure Java through an immutable setup-java v5 commit.',
);
requireMatch(
  workflowPath,
  workflow,
  /testDebugUnitTest\s+assembleDebug/,
  'Verify workflow must execute Android unit tests and compile a debug APK.',
);
requireMatch(
  workflowPath,
  workflow,
  /actions\/upload-artifact@[0-9a-f]{40}\s+# v7[\s\S]*android\/app\/build\/outputs\/apk\/debug\/app-debug\.apk/,
  'Successful verification must publish the compiled debug APK through a pinned upload-artifact v7 commit.',
);
requireMatch(
  workflowPath,
  workflow,
  /android\/app\/build\/reports\/tests\/testDebugUnitTest/,
  'Verification must preserve Android unit-test reports for diagnosis.',
);

const allowedPermissions = new Set([
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.PACKAGE_USAGE_STATS',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
]);
const permissions = [...manifest.matchAll(/<uses-permission[^>]+android:name="([^"]+)"/g)].map((match) => match[1]);
for (const permission of permissions) {
  if (allowedPermissions.has(permission)) continue;
  findings.push({
    file: manifestPath,
    text: `Unexpected Android permission ${permission}; add store declarations before allowing it.`,
  });
}

if (findings.length > 0) {
  console.log('Android project check failed:\n');
  for (const finding of findings) {
    console.log(`- ${finding.file}: ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  `Android project check passed. SDK ${minSdk}/${targetSdk}/${compileSdk}, ${permissions.length} permissions.`,
);