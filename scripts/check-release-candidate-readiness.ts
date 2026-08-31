import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const approvalPath = 'config/release-approval.json';
const packagePath = 'package.json';
const androidBuildPath = 'android/app/build.gradle';
const SHA_PATTERN = /^[0-9a-f]{40}$/;

interface EvidenceRecord {
  candidateCommitSha: string;
  reference: string;
}

interface ReleaseApproval {
  candidateVersion: string;
  candidateVersionCode: number;
  candidateCommitSha: string;
  webVerificationPassed: boolean;
  androidUnitTestsPassed: boolean;
  debugApkCompiled: boolean;
  evidence: {
    webVerification: EvidenceRecord;
    androidUnitTests: EvidenceRecord;
    debugApk: EvidenceRecord;
  };
}

const [approvalRaw, packageRaw, androidBuild] = await Promise.all([
  readFile(approvalPath, 'utf8'),
  readFile(packagePath, 'utf8'),
  readFile(androidBuildPath, 'utf8'),
]);

const approval = JSON.parse(approvalRaw) as ReleaseApproval;
const packageJson = JSON.parse(packageRaw) as { version?: string };
const versionName = androidBuild.match(/versionName\s+"([^"]+)"/)?.[1];
const versionCode = Number(androidBuild.match(/versionCode\s+(\d+)/)?.[1]);
const findings: string[] = [];

const requireCondition = (condition: boolean, message: string) => {
  if (!condition) findings.push(message);
};

requireCondition(SHA_PATTERN.test(approval.candidateCommitSha), 'candidateCommitSha must be frozen before building a signed candidate.');
requireCondition(
  approval.candidateVersion === packageJson.version && approval.candidateVersion === versionName,
  'candidateVersion must match package.json and Android versionName.',
);
requireCondition(
  Number.isInteger(approval.candidateVersionCode) && approval.candidateVersionCode === versionCode,
  'candidateVersionCode must match Android versionCode.',
);

const prerequisites: Array<{
  flag: boolean;
  evidence: EvidenceRecord | undefined;
  label: string;
}> = [
  {
    flag: approval.webVerificationPassed,
    evidence: approval.evidence?.webVerification,
    label: 'webVerificationPassed',
  },
  {
    flag: approval.androidUnitTestsPassed,
    evidence: approval.evidence?.androidUnitTests,
    label: 'androidUnitTestsPassed',
  },
  {
    flag: approval.debugApkCompiled,
    evidence: approval.evidence?.debugApk,
    label: 'debugApkCompiled',
  },
];

for (const prerequisite of prerequisites) {
  requireCondition(prerequisite.flag === true, `${prerequisite.label} must be true before building the signed release candidate.`);
  requireCondition(
    prerequisite.evidence?.candidateCommitSha === approval.candidateCommitSha &&
      (prerequisite.evidence?.reference.trim().length ?? 0) >= 3,
    `${prerequisite.label} must have retained evidence bound to candidateCommitSha.`,
  );
}

if (SHA_PATTERN.test(approval.candidateCommitSha)) {
  const diff = spawnSync('git', ['diff', '--name-only', approval.candidateCommitSha, 'HEAD', '--'], {
    encoding: 'utf8',
  });
  requireCondition(diff.status === 0, 'Unable to compare frozen candidateCommitSha with HEAD. Fetch the candidate history first.');
  if (diff.status === 0) {
    const changedPaths = diff.stdout
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    const unauthorized = changedPaths.filter((value) => value !== approvalPath);
    requireCondition(
      unauthorized.length === 0,
      `Product/build content changed after candidate freeze. Freeze and verify a new candidate:\n- ${unauthorized.join('\n- ')}`,
    );
  }
}

const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
requireCondition(status.status === 0, 'Unable to inspect the Git working tree.');
if (status.status === 0) {
  requireCondition(status.stdout.trim().length === 0, 'Signed candidate builds require a clean tracked working tree.');
}

if (findings.length > 0) {
  console.log('Release candidate readiness failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  `Signed candidate build allowed for ScrollShield ${approval.candidateVersion} (${approval.candidateVersionCode}), source candidate ${approval.candidateCommitSha}. Final release approval is still required after real candidate evidence.`,
);
