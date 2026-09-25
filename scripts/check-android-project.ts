import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
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

const buildGradle = await readFile(buildGradlePath, 'utf8');
const variablesGradle = await readFile(variablesGradlePath, 'utf8');
const manifest = await readFile(manifestPath, 'utf8');

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

// Every permission here needs a Play Console declaration before upload; see
// docs/STORE_SUBMISSION_PACKET.md. Adding a permission without updating this
// list (and that document) must fail the build.
const allowedPermissions = new Set([
  'android.permission.INTERNET',
  'android.permission.PACKAGE_USAGE_STATS',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
  'android.permission.POST_NOTIFICATIONS',
  // Normal permission, no Play Console declaration: restarts the app lock
  // after a reboot (BootReceiver).
  'android.permission.RECEIVE_BOOT_COMPLETED',
]);
// Entries with tools:node="remove" strip a permission a library would merge
// in; they declare nothing.
const permissions = [...manifest.matchAll(/<uses-permission[^>]+android:name="([^"]+)"[^>]*>/g)]
  .filter((match) => !/tools:node="remove"/.test(match[0]))
  .map((match) => match[1]);
for (const permission of permissions) {
  if (allowedPermissions.has(permission)) continue;
  findings.push({
    file: manifestPath,
    text: `Unexpected Android permission ${permission}; add store declarations before allowing it.`,
  });
}

// @capacitor/local-notifications merges these into the final manifest. The
// check above only sees this file, so the removals themselves are guarded.
for (const permission of ['SCHEDULE_EXACT_ALARM', 'WAKE_LOCK']) {
  requireMatch(
    manifestPath,
    manifest,
    new RegExp(`android:name="android\\.permission\\.${permission}"\\s+tools:node="remove"`),
    `${permission} from @capacitor/local-notifications must stay removed from the merged manifest.`,
  );
}

// The manifest uses the tools namespace for the PACKAGE_USAGE_STATS lint
// suppression; without the declaration the resource compiler fails.
if (/\btools:/.test(manifest)) {
  requireMatch(
    manifestPath,
    manifest,
    /xmlns:tools="http:\/\/schemas\.android\.com\/tools"/,
    'Manifest uses the tools namespace without declaring xmlns:tools.',
  );
}

// A foreground service must declare its type from Android 14 onwards.
if (/<service[^>]+android:name="\.AppMonitorService"/.test(manifest)) {
  requireMatch(
    manifestPath,
    manifest,
    /android:foregroundServiceType="specialUse"/,
    'AppMonitorService must declare its foreground service type.',
  );
  requireMatch(
    manifestPath,
    manifest,
    /PROPERTY_SPECIAL_USE_FGS_SUBTYPE/,
    'A specialUse foreground service must declare its subtype property.',
  );
}

// Kotlin sources only compile when the Kotlin plugin is applied. Without this
// check a Kotlin file can be added that silently never reaches the APK.
const kotlinSources = (await readdir(path.join(androidDir, 'app', 'src', 'main', 'java'), { recursive: true }))
  .map((entry) => String(entry))
  .filter((entry) => entry.endsWith('.kt'));

if (kotlinSources.length > 0) {
  requireMatch(
    buildGradlePath,
    buildGradle,
    /apply plugin: 'org\.jetbrains\.kotlin\.android'/,
    `Project contains ${kotlinSources.length} Kotlin source(s) but does not apply the Kotlin plugin.`,
  );

  const rootGradlePath = path.join(androidDir, 'build.gradle');
  const rootGradle = await readFile(rootGradlePath, 'utf8');
  requireMatch(
    rootGradlePath,
    rootGradle,
    /kotlin-gradle-plugin/,
    'Kotlin sources require the kotlin-gradle-plugin classpath.',
  );

  const usesSecurityCrypto = (
    await Promise.all(
      kotlinSources.map((file) => readFile(path.join(androidDir, 'app', 'src', 'main', 'java', file), 'utf8')),
    )
  ).some((source) => /androidx\.security\.crypto/.test(source));

  if (usesSecurityCrypto) {
    requireMatch(
      buildGradlePath,
      buildGradle,
      /androidx\.security:security-crypto/,
      'Kotlin sources import androidx.security.crypto without the matching dependency.',
    );
  }
}

if (findings.length > 0) {
  console.log('Android project check failed:\n');
  for (const finding of findings) {
    console.log(`- ${finding.file}: ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  `Android project check passed. SDK ${minSdk}/${targetSdk}/${compileSdk}, ${permissions.length} declared permissions.`,
);
