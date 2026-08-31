import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const files = {
  manifest: 'android/app/src/main/AndroidManifest.xml',
  filePaths: 'android/app/src/main/res/xml/file_paths.xml',
  buildGradle: 'android/app/build.gradle',
  packageJson: 'package.json',
  capacitor: 'capacitor.config.ts',
  gitignore: '.gitignore',
  signingCheck: 'scripts/check-android-release-signing.ts',
};

const missing = Object.values(files).filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.log('Android release hardening check failed:\n');
  for (const file of missing) console.log(`- Required file missing: ${file}`);
  process.exit(1);
}

const [manifest, filePaths, buildGradle, packageRaw, capacitor, gitignore, signingCheck] = await Promise.all([
  readFile(files.manifest, 'utf8'),
  readFile(files.filePaths, 'utf8'),
  readFile(files.buildGradle, 'utf8'),
  readFile(files.packageJson, 'utf8'),
  readFile(files.capacitor, 'utf8'),
  readFile(files.gitignore, 'utf8'),
  readFile(files.signingCheck, 'utf8'),
]);

const packageJson = JSON.parse(packageRaw) as { scripts?: Record<string, string> };
const findings: string[] = [];

const requirePattern = (file: string, content: string, pattern: RegExp, message: string) => {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
};
const rejectPattern = (file: string, content: string, pattern: RegExp, message: string) => {
  if (pattern.test(content)) findings.push(`${file}: ${message}`);
};

requirePattern(files.manifest, manifest, /android:allowBackup="false"/, 'App backup must remain disabled.');
requirePattern(
  files.manifest,
  manifest,
  /android:usesCleartextTraffic="false"/,
  'Cleartext network traffic must remain disabled.',
);
rejectPattern(
  files.manifest,
  manifest,
  /android:debuggable="true"/,
  'Production manifest must never force android:debuggable=true.',
);
rejectPattern(
  files.manifest,
  manifest,
  /android\.intent\.category\.BROWSABLE/,
  'Android v1 has no reviewed deep-link surface; BROWSABLE intents require a separate security review.',
);
requirePattern(
  files.manifest,
  manifest,
  /<provider[\s\S]*android:name="androidx\.core\.content\.FileProvider"[\s\S]*android:exported="false"[\s\S]*android:grantUriPermissions="true"/,
  'FileProvider must stay non-exported and use temporary URI grants only.',
);

rejectPattern(
  files.filePaths,
  filePaths,
  /<external-path\b/i,
  'FileProvider must never expose broad public external storage.',
);
requirePattern(
  files.filePaths,
  filePaths,
  /<files-path\b[\s\S]*<cache-path\b[\s\S]*<external-files-path\b[\s\S]*<external-cache-path\b/,
  'FileProvider paths must be restricted to ScrollShield-owned internal/external app storage.',
);

requirePattern(files.buildGradle, buildGradle, /release\s*\{[\s\S]*minifyEnabled\s+true/, 'Release R8 minification must stay enabled.');
requirePattern(files.buildGradle, buildGradle, /release\s*\{[\s\S]*shrinkResources\s+true/, 'Release resource shrinking must stay enabled.');
requirePattern(
  files.buildGradle,
  buildGradle,
  /signingPropertiesFile\.exists\(\)[\s\S]*signingConfig\s+signingConfigs\.release/,
  'Release signing must continue to use ignored local signing.properties.',
);

rejectPattern(
  files.capacitor,
  capacitor,
  /\burl\s*:\s*['"]https?:\/\//i,
  'Production Capacitor config must not load the application from a remote server URL.',
);
rejectPattern(
  files.capacitor,
  capacitor,
  /\ballowNavigation\s*:/,
  'Extra WebView navigation origins require explicit security review before release.',
);
rejectPattern(
  files.capacitor,
  capacitor,
  /\bcleartext\s*:\s*true/,
  'Capacitor cleartext mode must never be enabled for production.',
);
requirePattern(files.capacitor, capacitor, /webDir:\s*['"]dist['"]/, 'Production WebView must use packaged dist assets.');

const signingCommand = 'npm run check:android-signing';
if (packageJson.scripts?.['check:android-signing'] !== 'tsx scripts/check-android-release-signing.ts') {
  findings.push(`${files.packageJson}: check:android-signing must execute the dedicated release signing preflight.`);
}
for (const scriptName of ['android:release', 'android:bundle']) {
  const script = packageJson.scripts?.[scriptName] ?? '';
  const gateIndex = script.indexOf('npm run release:gate');
  const signingIndex = script.indexOf(signingCommand);
  const gradleIndex = script.indexOf('tsx scripts/run-gradle.ts');
  if (gateIndex < 0 || signingIndex < 0 || gradleIndex < 0 || !(gateIndex < signingIndex && signingIndex < gradleIndex)) {
    findings.push(
      `${files.packageJson}: ${scriptName} must run release:gate, then Android signing preflight, then the Gradle release task.`,
    );
  }
}

requirePattern(
  files.signingCheck,
  signingCheck,
  /storeFile[\s\S]*storePassword[\s\S]*keyAlias[\s\S]*keyPassword/,
  'Signing preflight must require all four signing properties.',
);
requirePattern(
  files.signingCheck,
  signingCheck,
  /path\.isAbsolute\(storeFile\)[\s\S]*must not escape the android\/ directory/,
  'Signing preflight must prevent keystore paths from escaping android/.',
);
requirePattern(files.gitignore, gitignore, /^android\/signing\.properties$/m, 'Local signing.properties must stay ignored.');
requirePattern(files.gitignore, gitignore, /^android\/\*\.jks$/m, 'Android JKS files must stay ignored.');
requirePattern(files.gitignore, gitignore, /^android\/\*\.keystore$/m, 'Android keystore files must stay ignored.');

if (findings.length > 0) {
  console.log('Android release hardening check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Android release hardening passed. FileProvider, packaged WebView origin, cleartext policy, R8, and release signing boundaries are guarded.',
);
