import { readFile } from 'node:fs/promises';

const pluginPath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldNativePlugin.java';
const bootReceiverPath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldBootReceiver.java';
const servicePath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldProtectionService.java';
const permissionScreenPath = 'src/screens/PermissionsScreen.tsx';
const permissionTestPath = 'src/screens/PermissionsScreen.test.tsx';

const [plugin, bootReceiver, service, permissionScreen, permissionTest] = await Promise.all([
  readFile(pluginPath, 'utf8'),
  readFile(bootReceiverPath, 'utf8'),
  readFile(servicePath, 'utf8'),
  readFile(permissionScreenPath, 'utf8'),
  readFile(permissionTestPath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

requirePattern(
  pluginPath,
  plugin,
  /if \(!hasNotificationsEnabled\(context\)\)[\s\S]*call\.reject\("Notifications are required/,
  'Protection start must require enabled notifications so the ongoing service and stop action remain visible.',
);
requirePattern(
  bootReceiverPath,
  bootReceiver,
  /ScrollShieldNativePlugin\.hasNotificationsEnabled\(context\)/,
  'Boot recovery must not restart protection while notifications are disabled.',
);
requirePattern(
  servicePath,
  service,
  /\.setOngoing\(true\)[\s\S]*"Schutz stoppen"/,
  'The foreground-service notification must remain ongoing and include a direct stop action.',
);
requirePattern(
  permissionScreenPath,
  permissionScreen,
  /optional:\s*operatingSystem !== 'android'/,
  'The notification permission must be required on Android and optional only on other platforms.',
);
requirePattern(
  permissionScreenPath,
  permissionScreen,
  /!nativeStatus\?\.usageAccess \|\| !nativeStatus\.overlay \|\| !nativeStatus\.notifications/,
  'The Android start control must block before native startup when notifications are disabled.',
);
requirePattern(
  permissionScreenPath,
  permissionScreen,
  /sichtbare Stop-Aktion/,
  'The permission explanation must disclose why notifications are required for Android protection.',
);
requirePattern(
  permissionTestPath,
  permissionTest,
  /marks notifications as required and blocks Android protection without them/,
  'A component test must protect the notification requirement and blocked startup behavior.',
);

if (findings.length > 0) {
  console.log('Protection transparency check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log('Protection transparency check passed. Android protection remains visible and directly stoppable.');
