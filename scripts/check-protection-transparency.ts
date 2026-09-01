import { readFile } from 'node:fs/promises';

const mainActivityPath = 'android/app/src/main/java/app/scrollshield/mobile/MainActivity.java';
const pluginPath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldNativePlugin.java';
const notificationPluginPath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldNotificationPlugin.java';
const bootReceiverPath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldBootReceiver.java';
const servicePath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldProtectionService.java';
const nativePermissionsPath = 'src/lib/nativePermissions.ts';
const nativePermissionsTestPath = 'src/lib/nativePermissions.test.ts';
const permissionScreenPath = 'src/screens/PermissionsScreen.tsx';
const permissionTestPath = 'src/screens/PermissionsScreen.test.tsx';

const [
  mainActivity,
  plugin,
  notificationPlugin,
  bootReceiver,
  service,
  nativePermissions,
  nativePermissionsTest,
  permissionScreen,
  permissionTest,
] = await Promise.all([
  readFile(mainActivityPath, 'utf8'),
  readFile(pluginPath, 'utf8'),
  readFile(notificationPluginPath, 'utf8'),
  readFile(bootReceiverPath, 'utf8'),
  readFile(servicePath, 'utf8'),
  readFile(nativePermissionsPath, 'utf8'),
  readFile(nativePermissionsTestPath, 'utf8'),
  readFile(permissionScreenPath, 'utf8'),
  readFile(permissionTestPath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

const channelIds = [plugin, notificationPlugin, service]
  .map((content) => content.match(/(?:PROTECTION_CHANNEL_ID|CHANNEL_ID)\s*=\s*"([^"]+)"/)?.[1])
  .filter((value): value is string => Boolean(value));
if (channelIds.length !== 3 || new Set(channelIds).size !== 1 || channelIds[0] !== 'scrollshield_protection') {
  findings.push(
    `${pluginPath}: native plugin, notification plugin, and service must share the scrollshield_protection channel id.`,
  );
}

requirePattern(
  mainActivityPath,
  mainActivity,
  /registerPlugin\(ScrollShieldNotificationPlugin\.class\)/,
  'MainActivity must register the dedicated notification permission plugin.',
);
requirePattern(
  notificationPluginPath,
  notificationPlugin,
  /@CapacitorPlugin\([\s\S]*Manifest\.permission\.POST_NOTIFICATIONS[\s\S]*NOTIFICATION_PERMISSION_ALIAS/,
  'The dedicated plugin must declare POST_NOTIFICATIONS through a Capacitor permission alias.',
);
requirePattern(
  notificationPluginPath,
  notificationPlugin,
  /requestPermissionForAlias\([\s\S]*notificationPermissionCallback/,
  'Android 13+ notification access must use Capacitor requestPermissionForAlias.',
);
requirePattern(
  notificationPluginPath,
  notificationPlugin,
  /@PermissionCallback[\s\S]*notificationPermissionCallback[\s\S]*resolvePermission/,
  'The native permission request must resolve through a registered PermissionCallback.',
);
requirePattern(
  notificationPluginPath,
  notificationPlugin,
  /ACTION_CHANNEL_NOTIFICATION_SETTINGS[\s\S]*EXTRA_APP_PACKAGE[\s\S]*EXTRA_CHANNEL_ID/,
  'Android 8+ fallback must open the exact protection notification channel.',
);
requirePattern(
  notificationPluginPath,
  notificationPlugin,
  /ACTION_APPLICATION_DETAILS_SETTINGS[\s\S]*Uri\.parse\("package:"/,
  'Android 7 fallback must open reliable application details settings.',
);
requirePattern(
  pluginPath,
  plugin,
  /if \(!hasNotificationsEnabled\(context\)\)[\s\S]*rejectProtectionStartPrerequisite\([\s\S]*ProtectionStopReasonPolicy\.NOTIFICATIONS_MISSING[\s\S]*Notifications are required so active protection and its stop action remain visible/,
  'Protection start must fail closed through the shared prerequisite helper when visible notifications are unavailable.',
);
requirePattern(
  pluginPath,
  plugin,
  /rejectProtectionStartPrerequisite\([\s\S]*persistProtectionSystemStopWithFallback\(context, reasonCode, description\)[\s\S]*ProtectionServiceDispatchGuard\.dispatchControlledStop\(context\)[\s\S]*call\.reject\(rejectionMessage\)/,
  'Notification prerequisite rejection must persist exact stop evidence and serialize Android stop dispatch before rejecting.',
);
requirePattern(
  pluginPath,
  plugin,
  /getNotificationChannel\(PROTECTION_CHANNEL_ID\)[\s\S]*IMPORTANCE_NONE/,
  'Notification health must detect a disabled protection channel, not only app-wide notification status.',
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
  /enforceCurrentApp\(\)[\s\S]*!ScrollShieldNativePlugin\.hasNotificationsEnabled\(this\)[\s\S]*nicht unsichtbar läuft/,
  'A running service must stop and record a warning if notification visibility is revoked.',
);
requirePattern(
  servicePath,
  service,
  /stopForeground\(STOP_FOREGROUND_REMOVE\)[\s\S]*stopForeground\(true\)/,
  'Service destruction must explicitly remove the foreground notification on supported and legacy Android versions.',
);
requirePattern(
  servicePath,
  service,
  /\.setOngoing\(true\)[\s\S]*"Schutz stoppen"/,
  'The foreground-service notification must remain ongoing and include a direct stop action.',
);
requirePattern(
  nativePermissionsPath,
  nativePermissions,
  /registerPlugin<ScrollShieldNotificationPlugin>\('ScrollShieldNotifications'\)/,
  'The TypeScript bridge must register the dedicated notification permission plugin.',
);
requirePattern(
  nativePermissionsPath,
  nativePermissions,
  /requestAndroidNotifications[\s\S]*ScrollShieldNotifications\.requestPermission/,
  'The TypeScript permission helper must call the native Android notification prompt.',
);
requirePattern(
  nativePermissionsPath,
  nativePermissions,
  /permission === 'notifications'[\s\S]*openAndroidNotificationSettings/,
  'Notification settings must route to the dedicated protection-channel plugin.',
);
requirePattern(
  nativePermissionsTestPath,
  nativePermissionsTest,
  /routes the Android notification prompt to the dedicated plugin/,
  'A unit test must cover runtime notification prompt routing.',
);
requirePattern(
  nativePermissionsTestPath,
  nativePermissionsTest,
  /routes notification settings to the protection channel/,
  'A unit test must cover channel-settings routing.',
);
requirePattern(
  nativePermissionsTestPath,
  nativePermissionsTest,
  /keeps other Android settings on the main native plugin/,
  'A unit test must prevent unrelated Android settings from being misrouted.',
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
  /requestAndroidNotifications\(\)[\s\S]*openAndroidSettings\('notifications'\)/,
  'The UI must request the runtime permission before falling back to Android settings.',
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
requirePattern(
  permissionTestPath,
  permissionTest,
  /uses the native Android notification prompt before opening settings/,
  'A component test must cover the successful native notification prompt.',
);
requirePattern(
  permissionTestPath,
  permissionTest,
  /opens Android settings after the notification prompt is denied/,
  'A component test must cover the denied-prompt settings fallback.',
);

if (findings.length > 0) {
  console.log('Protection transparency check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection transparency check passed. Android protection remains visible, channel-aware, prompt-driven, revocation-safe, fail-closed through atomic prerequisite persistence, and directly stoppable.',
);
