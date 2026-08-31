import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const files = {
  manifest: 'android/app/src/main/AndroidManifest.xml',
  filePaths: 'android/app/src/main/res/xml/file_paths.xml',
  dataExtractionRules: 'android/app/src/main/res/xml/data_extraction_rules.xml',
  backupRules: 'android/app/src/main/res/xml/backup_rules.xml',
  rootBuildGradle: 'android/build.gradle',
  buildGradle: 'android/app/build.gradle',
  packageJson: 'package.json',
  capacitor: 'capacitor.config.ts',
  gitignore: '.gitignore',
  signingCheck: 'scripts/check-android-release-signing.ts',
  candidateReadiness: 'scripts/check-release-candidate-readiness.ts',
  recordCandidate: 'scripts/record-release-candidate.ts',
  candidateArtifactCheck: 'scripts/check-release-candidate-artifact.ts',
};

const missing = Object.values(files).filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.log('Android release hardening check failed:\n');
  for (const file of missing) console.log(`- Required file missing: ${file}`);
  process.exit(1);
}

const [
  manifest,
  filePaths,
  dataExtractionRules,
  backupRules,
  rootBuildGradle,
  buildGradle,
  packageRaw,
  capacitor,
  gitignore,
  signingCheck,
  candidateReadiness,
  recordCandidate,
  candidateArtifactCheck,
] = await Promise.all([
  readFile(files.manifest, 'utf8'),
  readFile(files.filePaths, 'utf8'),
  readFile(files.dataExtractionRules, 'utf8'),
  readFile(files.backupRules, 'utf8'),
  readFile(files.rootBuildGradle, 'utf8'),
  readFile(files.buildGradle, 'utf8'),
  readFile(files.packageJson, 'utf8'),
  readFile(files.capacitor, 'utf8'),
  readFile(files.gitignore, 'utf8'),
  readFile(files.signingCheck, 'utf8'),
  readFile(files.candidateReadiness, 'utf8'),
  readFile(files.recordCandidate, 'utf8'),
  readFile(files.candidateArtifactCheck, 'utf8'),
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
  /android:dataExtractionRules="@xml\/data_extraction_rules"/,
  'Android 12+ cloud/device-transfer rules must remain explicitly attached.',
);
requirePattern(
  files.manifest,
  manifest,
  /android:fullBackupContent="@xml\/backup_rules"/,
  'Android 11- Auto Backup exclusions must remain explicitly attached.',
);
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

for (const domain of ['root', 'file', 'database', 'sharedpref', 'external']) {
  const exclusion = new RegExp(`<exclude\\s+domain="${domain}"\\s+path="\\."\\s*\\/>`);
  const dataExtractionCount = [...dataExtractionRules.matchAll(new RegExp(exclusion.source, 'g'))].length;
  if (dataExtractionCount < 2) {
    findings.push(
      `${files.dataExtractionRules}: domain=${domain} must be excluded from both cloud backup and device transfer.`,
    );
  }
  requirePattern(
    files.backupRules,
    backupRules,
    exclusion,
    `Legacy Auto Backup must exclude domain=${domain} path=.`,
  );
}
requirePattern(
  files.dataExtractionRules,
  dataExtractionRules,
  /<cloud-backup>[\s\S]*<\/cloud-backup>[\s\S]*<device-transfer>[\s\S]*<\/device-transfer>/,
  'Android 12+ rules must explicitly cover both cloud backup and device transfer.',
);

requirePattern(
  files.buildGradle,
  buildGradle,
  /buildTypes\s*\{[\s\S]*release\s*\{[\s\S]*minifyEnabled\s+true/,
  'Release R8 minification must stay enabled.',
);
requirePattern(
  files.buildGradle,
  buildGradle,
  /buildTypes\s*\{[\s\S]*release\s*\{[\s\S]*shrinkResources\s+true/,
  'Release resource shrinking must stay enabled.',
);
requirePattern(
  files.buildGradle,
  buildGradle,
  /signingPropertiesFile\.exists\(\)[\s\S]*signingConfig\s+signingConfigs\.release/,
  'Release signing must continue to use ignored local signing.properties.',
);
rejectPattern(
  files.rootBuildGradle,
  rootBuildGradle,
  /com\.google\.gms:google-services|com\.google\.gms\.google-services/,
  'Offline Android v1 must not carry the Google Services Gradle plugin without a reviewed network/push architecture.',
);
rejectPattern(
  files.buildGradle,
  buildGradle,
  /google-services\.json|com\.google\.gms\.google-services/,
  'Offline Android v1 must not conditionally activate Google Services/Firebase from the app build.',
);
if (existsSync('android/app/google-services.json')) {
  findings.push('android/app/google-services.json: offline Android v1 must not ship a Google Services runtime configuration.');
}

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

if (packageJson.scripts?.['check:android-hardening'] !== 'tsx scripts/check-android-release-hardening.ts') {
  findings.push(`${files.packageJson}: check:android-hardening must execute this release-hardening guard.`);
}
if (!packageJson.scripts?.verify?.includes('npm run check:android-hardening')) {
  findings.push(`${files.packageJson}: verify must include check:android-hardening.`);
}

if (packageJson.scripts?.['check:android-signing'] !== 'tsx scripts/check-android-release-signing.ts') {
  findings.push(`${files.packageJson}: check:android-signing must execute the dedicated release signing preflight.`);
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

if (packageJson.scripts?.['release:candidate-gate'] !== 'tsx scripts/check-release-candidate-readiness.ts') {
  findings.push(`${files.packageJson}: release:candidate-gate must use the dedicated pre-binary candidate gate.`);
}
requirePattern(
  files.candidateReadiness,
  candidateReadiness,
  /webVerificationPassed[\s\S]*androidUnitTestsPassed[\s\S]*debugApkCompiled/,
  'Signed candidate gate must require successful source verification, Android unit tests, and debug APK compilation.',
);
requirePattern(
  files.candidateReadiness,
  candidateReadiness,
  /candidateCommitSha[\s\S]*spawnSync\('git', \['diff'/,
  'Signed candidate gate must compare the frozen source candidate against the build HEAD.',
);
requirePattern(
  files.candidateReadiness,
  candidateReadiness,
  /changedPaths[\s\S]*path !== approvalPath|changedPaths[\s\S]*value !== approvalPath/,
  'Signed candidate gate must reject release-affecting drift while allowing approval-manifest updates only.',
);

const candidateCommands = [
  {
    name: 'android:candidate:release',
    gradleToken: 'assembleRelease',
    recordToken: 'tsx scripts/record-release-candidate.ts apk',
  },
  {
    name: 'android:candidate:bundle',
    gradleToken: 'bundleRelease',
    recordToken: 'tsx scripts/record-release-candidate.ts bundle',
  },
];
for (const command of candidateCommands) {
  const script = packageJson.scripts?.[command.name] ?? '';
  const gateIndex = script.indexOf('npm run release:candidate-gate');
  const signingIndex = script.indexOf('npm run check:android-signing');
  const gradleIndex = script.indexOf(command.gradleToken);
  const recordIndex = script.indexOf(command.recordToken);
  if (
    gateIndex < 0 ||
    signingIndex < 0 ||
    gradleIndex < 0 ||
    recordIndex < 0 ||
    !(gateIndex < signingIndex && signingIndex < gradleIndex && gradleIndex < recordIndex)
  ) {
    findings.push(
      `${files.packageJson}: ${command.name} must run candidate gate -> signing preflight -> release Gradle task -> artifact recording.`,
    );
  }
}

requirePattern(
  files.recordCandidate,
  recordCandidate,
  /createHash\('sha256'\)/,
  'Candidate recording must compute a SHA-256 digest.',
);
requirePattern(
  files.recordCandidate,
  recordCandidate,
  /candidateCommitSha/,
  'Candidate recording must bind metadata to the frozen source candidate.',
);
requirePattern(
  files.recordCandidate,
  recordCandidate,
  /\.scrollshield-release-candidate/,
  'Candidate recording must use ignored local candidate metadata.',
);
requirePattern(
  files.recordCandidate,
  recordCandidate,
  /app-release\.apk[\s\S]*app-release\.aab/,
  'Candidate recorder must recognize the exact release APK and AAB output paths.',
);

const finalCommands = [
  { name: 'android:release', artifactToken: 'tsx scripts/check-release-candidate-artifact.ts apk' },
  { name: 'android:bundle', artifactToken: 'tsx scripts/check-release-candidate-artifact.ts bundle' },
];
for (const command of finalCommands) {
  const script = packageJson.scripts?.[command.name] ?? '';
  const gateIndex = script.indexOf('npm run release:gate');
  const artifactIndex = script.indexOf(command.artifactToken);
  if (gateIndex < 0 || artifactIndex < 0 || gateIndex > artifactIndex) {
    findings.push(`${files.packageJson}: ${command.name} must run final release gate before retained-artifact validation.`);
  }
  if (/run-gradle|assembleRelease|bundleRelease/.test(script)) {
    findings.push(
      `${files.packageJson}: ${command.name} must not rebuild after binary inspection; it must validate the retained candidate bytes.`,
    );
  }
}

requirePattern(
  files.candidateArtifactCheck,
  candidateArtifactCheck,
  /signedBinaryInspected[\s\S]*signedBinaryReference\.includes\(metadataSha256/,
  'Final artifact check must bind signed-binary evidence to the exact retained SHA-256.',
);
requirePattern(
  files.candidateArtifactCheck,
  candidateArtifactCheck,
  /actualHash === metadataSha256[\s\S]*artifactStat\.size === metadata\.sizeBytes/,
  'Final artifact check must detect any byte or size change after inspection.',
);

requirePattern(files.gitignore, gitignore, /^\.scrollshield-release-candidate\/$/m, 'Local candidate metadata must stay ignored.');
requirePattern(files.gitignore, gitignore, /^android\/signing\.properties$/m, 'Local signing.properties must stay ignored.');
requirePattern(files.gitignore, gitignore, /^android\/\*\.jks$/m, 'Android JKS files must stay ignored.');
requirePattern(files.gitignore, gitignore, /^android\/\*\.keystore$/m, 'Android keystore files must stay ignored.');

if (findings.length > 0) {
  console.log('Android release hardening check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Android release hardening passed. Backup/D2D, FileProvider, packaged WebView origin, offline build surface, R8, signed candidate creation, and retained-binary final approval are guarded.',
);
