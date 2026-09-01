import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findAndroidSdk } from './android-env';

const type = process.argv[2];
if (type !== 'apk' && type !== 'bundle') {
  console.error('Usage: tsx scripts/inspect-release-candidate.ts <apk|bundle>');
  process.exit(1);
}

const metadataPath = path.join('.scrollshield-release-candidate', `${type}.json`);
const inspectionDir = '.scrollshield-release-candidate';
const inspectionPath = path.join(inspectionDir, `${type}-inspection.json`);
const manifestLogPath = path.join(inspectionDir, `${type}-manifest.txt`);
const permissionLogPath = path.join(inspectionDir, `${type}-permissions.txt`);
const archiveLogPath = path.join(inspectionDir, `${type}-archive.txt`);
const expectedArtifactPath =
  type === 'apk'
    ? 'android/app/build/outputs/apk/release/app-release.apk'
    : 'android/app/build/outputs/bundle/release/app-release.aab';
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;

const allowedPermissions = new Set([
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.PACKAGE_USAGE_STATS',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
]);

const forbiddenMarkers = [
  'google-services.json',
  'firebase',
  'crashlytics',
  'sentry',
  'appsflyer',
  'adjust',
  'branch.io',
  'mixpanel',
  'amplitude',
  'segment',
  'posthog',
  'admob',
  'facebook/appevents',
  'installreferrer',
];

function run(command: string, args: string[], shell = false) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell,
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function commandForPlatform(command: string) {
  return process.platform === 'win32' && command.endsWith('.bat')
    ? { command, shell: true }
    : { command, shell: false };
}

async function sha256File(file: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(file);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function findApkAnalyzer(): Promise<string | undefined> {
  const sdk = findAndroidSdk();
  if (!sdk) return undefined;
  const executable = process.platform === 'win32' ? 'apkanalyzer.bat' : 'apkanalyzer';
  const candidates = [
    path.join(sdk, 'cmdline-tools', 'latest', 'bin', executable),
    path.join(sdk, 'tools', 'bin', executable),
  ];

  const cmdlineTools = path.join(sdk, 'cmdline-tools');
  if (existsSync(cmdlineTools)) {
    const versions = (await readdir(cmdlineTools, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && entry.name !== 'latest')
      .map((entry) => entry.name)
      .sort()
      .reverse();
    for (const version of versions) candidates.push(path.join(cmdlineTools, version, 'bin', executable));
  }

  return candidates.find((candidate) => existsSync(candidate));
}

if (!existsSync(metadataPath)) {
  console.error(`Binary inspection failed: candidate metadata missing at ${metadataPath}.`);
  console.error(
    `Build and record the candidate first with android:candidate:${type === 'apk' ? 'release' : 'bundle'}.`,
  );
  process.exit(1);
}
if (!existsSync(expectedArtifactPath)) {
  console.error(`Binary inspection failed: retained candidate artifact is missing at ${expectedArtifactPath}.`);
  process.exit(1);
}

const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as {
  schemaVersion?: number;
  type?: string;
  candidateCommitSha?: string;
  buildHeadSha?: string;
  artifactPath?: string;
  sha256?: string;
  sizeBytes?: number;
};
const findings: string[] = [];
const actualHash = await sha256File(expectedArtifactPath);

if (metadata.schemaVersion !== 1) findings.push('Candidate metadata schemaVersion must equal 1.');
if (metadata.type !== type) findings.push(`Candidate metadata type must equal ${type}.`);
if (metadata.artifactPath !== expectedArtifactPath)
  findings.push(`Candidate artifact path must equal ${expectedArtifactPath}.`);
if (!SHA_PATTERN.test(metadata.candidateCommitSha ?? ''))
  findings.push('Candidate metadata must contain a valid source SHA.');
if (!SHA_PATTERN.test(metadata.buildHeadSha ?? ''))
  findings.push('Candidate metadata must contain a valid build HEAD SHA.');
if (!HASH_PATTERN.test(metadata.sha256 ?? '')) findings.push('Candidate metadata must contain a valid SHA-256.');
if (metadata.sha256 !== actualHash) findings.push('Candidate artifact bytes no longer match the recorded SHA-256.');

let manifestOutput = '';
let permissionOutput = '';
let manifestTool = '';

if (type === 'apk') {
  const apkanalyzer = await findApkAnalyzer();
  if (!apkanalyzer) {
    findings.push(
      'Android SDK apkanalyzer was not found. Install Android SDK Command-line Tools before binary inspection.',
    );
  } else {
    const analyzer = commandForPlatform(apkanalyzer);
    const manifest = run(analyzer.command, ['manifest', 'print', expectedArtifactPath], analyzer.shell);
    const permissions = run(analyzer.command, ['manifest', 'permissions', expectedArtifactPath], analyzer.shell);
    if (!manifest.ok)
      findings.push(`apkanalyzer manifest print failed: ${manifest.stderr.trim() || `exit ${manifest.status}`}`);
    if (!permissions.ok)
      findings.push(
        `apkanalyzer manifest permissions failed: ${permissions.stderr.trim() || `exit ${permissions.status}`}`,
      );
    manifestOutput = manifest.stdout;
    permissionOutput = permissions.stdout;
    manifestTool = apkanalyzer;
  }
} else {
  const bundletoolJar = process.env.BUNDLETOOL_JAR?.trim();
  if (!bundletoolJar || !existsSync(bundletoolJar)) {
    findings.push(
      'AAB inspection requires BUNDLETOOL_JAR to point to a reviewed local bundletool .jar. No automatic download is performed.',
    );
  } else {
    const java = process.platform === 'win32' ? 'java.exe' : 'java';
    const manifest = run(java, [
      '-jar',
      bundletoolJar,
      'dump',
      'manifest',
      `--bundle=${expectedArtifactPath}`,
      '--module=base',
    ]);
    if (!manifest.ok)
      findings.push(`bundletool dump manifest failed: ${manifest.stderr.trim() || `exit ${manifest.status}`}`);
    manifestOutput = manifest.stdout;
    permissionOutput = [...manifestOutput.matchAll(/android:name="(android\.permission\.[A-Z0-9_]+)"/g)]
      .map((match) => match[1])
      .join('\n');
    manifestTool = bundletoolJar;
  }
}

const jar = process.platform === 'win32' ? 'jar.exe' : 'jar';
const archive = run(jar, ['tf', expectedArtifactPath]);
if (!archive.ok) findings.push(`JDK jar archive listing failed: ${archive.stderr.trim() || `exit ${archive.status}`}`);
const archiveOutput = archive.stdout;

const permissionSet = new Set(
  [...permissionOutput.matchAll(/android\.permission\.[A-Z0-9_]+/g)].map((match) => match[0]),
);
for (const permission of permissionSet) {
  if (!allowedPermissions.has(permission))
    findings.push(`Unexpected binary permission requires explicit review: ${permission}`);
}
for (const permission of allowedPermissions) {
  if (!permissionSet.has(permission))
    findings.push(`Expected ScrollShield permission missing from binary manifest: ${permission}`);
}

if (/android\.permission\.INTERNET/.test(manifestOutput + permissionOutput)) {
  findings.push('Offline Android v1 binary unexpectedly contains android.permission.INTERNET.');
}
if (
  /com\.google\.android\.gms\.permission\.AD_ID|android\.permission\.ACCESS_ADSERVICES_AD_ID/.test(
    manifestOutput + permissionOutput,
  )
) {
  findings.push('Binary unexpectedly contains an advertising identifier permission.');
}
if (/android:debuggable="true"/.test(manifestOutput)) findings.push('Release binary is debuggable.');
if (/android:usesCleartextTraffic="true"/.test(manifestOutput))
  findings.push('Release binary permits cleartext traffic.');
if (manifestOutput && !manifestOutput.includes('app.scrollshield.mobile'))
  findings.push('Binary manifest does not identify app.scrollshield.mobile.');

const archiveLower = archiveOutput.toLowerCase();
const suspiciousArchiveMarkers = forbiddenMarkers.filter((marker) => archiveLower.includes(marker.toLowerCase()));
for (const marker of suspiciousArchiveMarkers)
  findings.push(`Unexpected tracker/network marker found in binary archive paths: ${marker}`);

mkdirSync(inspectionDir, { recursive: true });
writeFileSync(manifestLogPath, manifestOutput || '<manifest unavailable>\n', 'utf8');
writeFileSync(permissionLogPath, `${[...permissionSet].sort().join('\n')}\n`, 'utf8');
writeFileSync(archiveLogPath, archiveOutput || '<archive listing unavailable>\n', 'utf8');

const report = {
  schemaVersion: 1,
  status: findings.length === 0 ? 'passed' : 'failed',
  inspectedAt: new Date().toISOString(),
  type,
  artifactPath: expectedArtifactPath,
  candidateCommitSha: metadata.candidateCommitSha ?? '',
  buildHeadSha: metadata.buildHeadSha ?? '',
  sha256: actualHash,
  manifestTool,
  permissions: [...permissionSet].sort(),
  allowedPermissions: [...allowedPermissions].sort(),
  suspiciousArchiveMarkers,
  logs: {
    manifest: path.basename(manifestLogPath),
    permissions: path.basename(permissionLogPath),
    archive: path.basename(archiveLogPath),
  },
  findings,
};
writeFileSync(inspectionPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (findings.length > 0) {
  console.log('Signed candidate binary inspection FAILED:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  console.log(`\nInspection report: ${inspectionPath}`);
  process.exit(1);
}

console.log(`Signed ${type} candidate binary inspection passed for ${metadata.candidateCommitSha}.`);
console.log(`SHA-256: ${actualHash}`);
console.log(`Inspection report: ${inspectionPath}`);
console.log(
  'Do not set signedBinaryInspected=true unless this exact retained artifact and report are retained as evidence.',
);
