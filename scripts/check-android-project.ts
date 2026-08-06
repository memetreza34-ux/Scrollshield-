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

const allowedPermissions = new Set(['android.permission.INTERNET']);
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
  `Android project check passed. SDK ${minSdk}/${targetSdk}/${compileSdk}, ${permissions.length} permission.`,
);
