import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const type = process.argv[2];
if (type !== 'apk' && type !== 'bundle') {
  console.error('Usage: tsx scripts/check-release-candidate-artifact.ts <apk|bundle>');
  process.exit(1);
}

const approvalPath = 'config/release-approval.json';
const expectedArtifactPath =
  type === 'apk'
    ? 'android/app/build/outputs/apk/release/app-release.apk'
    : 'android/app/build/outputs/bundle/release/app-release.aab';
const metadataPath = path.join('.scrollshield-release-candidate', `${type}.json`);
const inspectionPath = path.join('.scrollshield-release-candidate', `${type}-inspection.json`);
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;

if (!existsSync(metadataPath)) {
  console.error(`Final release artifact check failed: candidate metadata missing at ${metadataPath}.`);
  console.error(
    `Build and record the signed candidate first with android:candidate:${type === 'apk' ? 'release' : 'bundle'}.`,
  );
  process.exit(1);
}
if (!existsSync(inspectionPath)) {
  console.error(`Final release artifact check failed: binary inspection report missing at ${inspectionPath}.`);
  console.error(
    `Inspect the retained candidate first with android:inspect:candidate:${type === 'apk' ? 'release' : 'bundle'}.`,
  );
  process.exit(1);
}

const [approvalRaw, metadataRaw, inspectionRaw, packageRaw, buildGradle] = await Promise.all([
  readFile(approvalPath, 'utf8'),
  readFile(metadataPath, 'utf8'),
  readFile(inspectionPath, 'utf8'),
  readFile('package.json', 'utf8'),
  readFile('android/app/build.gradle', 'utf8'),
]);

const approval = JSON.parse(approvalRaw) as {
  candidateVersion: string;
  candidateVersionCode: number;
  candidateCommitSha: string;
  signedBinaryInspected: boolean;
  evidence?: {
    signedBinary?: {
      candidateCommitSha?: string;
      reference?: string;
    };
  };
};
const metadata = JSON.parse(metadataRaw) as {
  schemaVersion?: number;
  type?: string;
  candidateCommitSha?: string;
  buildHeadSha?: string;
  versionName?: string;
  versionCode?: number;
  artifactPath?: string;
  sha256?: string;
  sizeBytes?: number;
};
const inspection = JSON.parse(inspectionRaw) as {
  schemaVersion?: number;
  status?: string;
  type?: string;
  artifactPath?: string;
  candidateCommitSha?: string;
  buildHeadSha?: string;
  sha256?: string;
  permissions?: string[];
  findings?: string[];
};
const packageJson = JSON.parse(packageRaw) as { version?: string };
const androidVersionName = buildGradle.match(/versionName\s+"([^"]+)"/)?.[1];
const androidVersionCode = Number(buildGradle.match(/versionCode\s+(\d+)/)?.[1]);
const metadataSha256 = metadata.sha256 ?? '';
const metadataCandidateSha = metadata.candidateCommitSha ?? '';
const metadataBuildHeadSha = metadata.buildHeadSha ?? '';
const findings: string[] = [];

const requireCondition = (condition: boolean, message: string) => {
  if (!condition) findings.push(message);
};

requireCondition(metadata.schemaVersion === 1, 'Candidate artifact metadata schemaVersion must equal 1.');
requireCondition(metadata.type === type, `Candidate artifact metadata type must equal ${type}.`);
requireCondition(
  metadata.artifactPath === expectedArtifactPath,
  `Candidate artifact path must be ${expectedArtifactPath}.`,
);
requireCondition(
  SHA_PATTERN.test(metadataCandidateSha),
  'Candidate artifact metadata must contain a valid source SHA.',
);
requireCondition(
  SHA_PATTERN.test(metadataBuildHeadSha),
  'Candidate artifact metadata must contain a valid build HEAD SHA.',
);
requireCondition(HASH_PATTERN.test(metadataSha256), 'Candidate artifact metadata must contain a SHA-256 hash.');
requireCondition(
  metadataCandidateSha === approval.candidateCommitSha,
  'Retained artifact belongs to a different source candidate.',
);
requireCondition(
  metadata.versionName === approval.candidateVersion &&
    metadata.versionName === packageJson.version &&
    metadata.versionName === androidVersionName,
  'Retained artifact version no longer matches release/package/Android version.',
);
requireCondition(
  metadata.versionCode === approval.candidateVersionCode && metadata.versionCode === androidVersionCode,
  'Retained artifact versionCode no longer matches release/Android versionCode.',
);

requireCondition(inspection.schemaVersion === 1, 'Binary inspection report schemaVersion must equal 1.');
requireCondition(inspection.status === 'passed', 'Binary inspection report must have status=passed.');
requireCondition(inspection.type === type, `Binary inspection report type must equal ${type}.`);
requireCondition(
  inspection.artifactPath === expectedArtifactPath,
  'Binary inspection report points to a different artifact path.',
);
requireCondition(
  inspection.candidateCommitSha === metadataCandidateSha,
  'Binary inspection belongs to a different source candidate.',
);
requireCondition(
  inspection.buildHeadSha === metadataBuildHeadSha,
  'Binary inspection belongs to a different build HEAD.',
);
requireCondition(inspection.sha256 === metadataSha256, 'Binary inspection belongs to different artifact bytes.');
requireCondition(
  Array.isArray(inspection.permissions),
  'Binary inspection report must contain the resolved permission list.',
);
requireCondition(
  Array.isArray(inspection.findings) && inspection.findings.length === 0,
  'Passed binary inspection must contain zero findings.',
);

requireCondition(approval.signedBinaryInspected === true, 'Final artifact use requires signedBinaryInspected=true.');
requireCondition(
  approval.evidence?.signedBinary?.candidateCommitSha === approval.candidateCommitSha,
  'Signed-binary evidence must be bound to the frozen candidate SHA.',
);
const signedBinaryReference = approval.evidence?.signedBinary?.reference?.toLowerCase() ?? '';
requireCondition(
  HASH_PATTERN.test(metadataSha256) && signedBinaryReference.includes(metadataSha256.toLowerCase()),
  'Signed-binary evidence reference must contain the exact retained artifact SHA-256.',
);

if (!existsSync(expectedArtifactPath)) {
  findings.push(`Retained candidate artifact is missing: ${expectedArtifactPath}`);
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

if (existsSync(expectedArtifactPath)) {
  const [actualHash, artifactStat] = await Promise.all([sha256File(expectedArtifactPath), stat(expectedArtifactPath)]);
  requireCondition(
    actualHash === metadataSha256,
    'Retained candidate artifact bytes changed after recording/inspection.',
  );
  requireCondition(
    actualHash === inspection.sha256,
    'Retained candidate artifact bytes changed after binary inspection.',
  );
  requireCondition(
    artifactStat.size === metadata.sizeBytes,
    'Retained candidate artifact size changed after recording.',
  );
}

if (SHA_PATTERN.test(approval.candidateCommitSha)) {
  for (const [label, targetSha] of [
    ['recorded build HEAD', metadataBuildHeadSha],
    ['current HEAD', 'HEAD'],
  ] as const) {
    if (targetSha !== 'HEAD' && !SHA_PATTERN.test(targetSha)) continue;
    const diff = spawnSync('git', ['diff', '--name-only', approval.candidateCommitSha, targetSha, '--'], {
      encoding: 'utf8',
    });
    requireCondition(diff.status === 0, `Unable to compare candidate source with ${label}.`);
    if (diff.status === 0) {
      const unauthorized = diff.stdout
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter((value) => value && value !== approvalPath);
      requireCondition(
        unauthorized.length === 0,
        `${label} contains release-affecting changes after candidate freeze:\n- ${unauthorized.join('\n- ')}`,
      );
    }
  }
}

const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
requireCondition(status.status === 0, 'Unable to inspect current tracked working tree.');
if (status.status === 0) {
  requireCondition(
    status.stdout.trim().length === 0,
    'Final artifact validation requires a clean tracked working tree.',
  );
}

if (findings.length > 0) {
  console.log('Final release artifact check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  `Final ${type} artifact identity and binary inspection passed for candidate ${approval.candidateCommitSha}.`,
);
console.log(`Retained artifact: ${expectedArtifactPath}`);
console.log(`SHA-256: ${metadataSha256}`);
console.log(`Inspection report: ${inspectionPath}`);
console.log('Use this retained artifact; rebuilding would create a new binary that requires fresh binary evidence.');
