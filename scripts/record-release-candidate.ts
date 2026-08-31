import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const type = process.argv[2];
if (type !== 'apk' && type !== 'bundle') {
  console.error('Usage: tsx scripts/record-release-candidate.ts <apk|bundle>');
  process.exit(1);
}

const approvalPath = 'config/release-approval.json';
const artifactPath =
  type === 'apk'
    ? 'android/app/build/outputs/apk/release/app-release.apk'
    : 'android/app/build/outputs/bundle/release/app-release.aab';
const metadataDir = '.scrollshield-release-candidate';
const metadataPath = path.join(metadataDir, `${type}.json`);
const SHA_PATTERN = /^[0-9a-f]{40}$/;

const [approvalRaw, packageRaw, buildGradle] = await Promise.all([
  readFile(approvalPath, 'utf8'),
  readFile('package.json', 'utf8'),
  readFile('android/app/build.gradle', 'utf8'),
]);
const approval = JSON.parse(approvalRaw) as {
  candidateVersion: string;
  candidateVersionCode: number;
  candidateCommitSha: string;
};
const packageJson = JSON.parse(packageRaw) as { version?: string };
const versionName = buildGradle.match(/versionName\s+"([^"]+)"/)?.[1];
const versionCode = Number(buildGradle.match(/versionCode\s+(\d+)/)?.[1]);
const findings: string[] = [];

if (!SHA_PATTERN.test(approval.candidateCommitSha)) {
  findings.push('candidateCommitSha must be frozen before recording a release candidate.');
}
if (approval.candidateVersion !== packageJson.version || approval.candidateVersion !== versionName) {
  findings.push('Candidate version no longer matches package.json and Android versionName.');
}
if (!Number.isInteger(versionCode) || approval.candidateVersionCode !== versionCode) {
  findings.push('Candidate versionCode no longer matches Android versionCode.');
}
if (!existsSync(artifactPath)) {
  findings.push(`Expected signed candidate artifact is missing: ${artifactPath}`);
}

const buildHead = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
const buildHeadSha = buildHead.status === 0 ? buildHead.stdout.trim() : '';
if (!SHA_PATTERN.test(buildHeadSha)) findings.push('Unable to resolve build HEAD SHA.');

if (SHA_PATTERN.test(approval.candidateCommitSha)) {
  const diff = spawnSync('git', ['diff', '--name-only', approval.candidateCommitSha, 'HEAD', '--'], {
    encoding: 'utf8',
  });
  if (diff.status !== 0) {
    findings.push('Unable to compare frozen candidate source with current HEAD.');
  } else {
    const unauthorized = diff.stdout
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter((value) => value && value !== approvalPath);
    if (unauthorized.length > 0) {
      findings.push(`Release content changed after candidate freeze:\n- ${unauthorized.join('\n- ')}`);
    }
  }
}

const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
if (status.status !== 0 || status.stdout.trim().length > 0) {
  findings.push('Candidate recording requires a clean tracked working tree.');
}

if (findings.length > 0) {
  console.log('Release candidate recording failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
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

const artifactStat = await stat(artifactPath);
const sha256 = await sha256File(artifactPath);
const recordedAt = new Date().toISOString();

await mkdir(metadataDir, { recursive: true });
await writeFile(
  metadataPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      type,
      candidateCommitSha: approval.candidateCommitSha,
      buildHeadSha,
      versionName: approval.candidateVersion,
      versionCode: approval.candidateVersionCode,
      artifactPath,
      sha256,
      sizeBytes: artifactStat.size,
      artifactModifiedAt: artifactStat.mtime.toISOString(),
      recordedAt,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(`Recorded signed ${type} candidate for source ${approval.candidateCommitSha}.`);
console.log(`Artifact: ${artifactPath}`);
console.log(`SHA-256: ${sha256}`);
console.log(`Metadata: ${metadataPath}`);
console.log('Do not rebuild this artifact after binary inspection; final approval must retain these exact bytes.');
