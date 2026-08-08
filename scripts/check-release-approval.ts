import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

type EvidenceKey =
  | 'webVerification'
  | 'androidUnitTests'
  | 'debugApk'
  | 'physicalDeviceMatrix'
  | 'terminalLifecycle'
  | 'batteryReliability'
  | 'migrationValidation'
  | 'playDeclarations'
  | 'legalFields'
  | 'reviewVideos'
  | 'signedBinary';

type ApprovalFlag =
  | 'webVerificationPassed'
  | 'androidUnitTestsPassed'
  | 'debugApkCompiled'
  | 'physicalDeviceMatrixPassed'
  | 'terminalLifecycleValidationPassed'
  | 'batteryReliabilityPassed'
  | 'migrationValidationPassed'
  | 'playDeclarationsFinal'
  | 'legalFieldsComplete'
  | 'reviewVideosRecorded'
  | 'signedBinaryInspected';

interface EvidenceRecord {
  candidateCommitSha: string;
  reference: string;
}

interface ReleaseApproval {
  schemaVersion: number;
  candidateVersion: string;
  candidateVersionCode: number;
  candidateCommitSha: string;
  webVerificationPassed: boolean;
  androidUnitTestsPassed: boolean;
  debugApkCompiled: boolean;
  physicalDeviceMatrixPassed: boolean;
  terminalLifecycleValidationPassed: boolean;
  batteryReliabilityPassed: boolean;
  migrationValidationPassed: boolean;
  playDeclarationsFinal: boolean;
  legalFieldsComplete: boolean;
  reviewVideosRecorded: boolean;
  signedBinaryInspected: boolean;
  evidence: Record<EvidenceKey, EvidenceRecord>;
  approvedBy: string;
  approvedAt: string;
}

const strict = process.argv.includes('--strict');
const approvalPath = 'config/release-approval.json';
const packagePath = 'package.json';
const androidBuildPath = 'android/app/build.gradle';
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const EVIDENCE_REFERENCE_MAX_LENGTH = 1000;

const [approvalRaw, packageRaw, androidBuild] = await Promise.all([
  readFile(approvalPath, 'utf8'),
  readFile(packagePath, 'utf8'),
  readFile(androidBuildPath, 'utf8'),
]);

const findings: string[] = [];
let approval: ReleaseApproval;

try {
  approval = JSON.parse(approvalRaw) as ReleaseApproval;
} catch (error) {
  console.error(`Release approval check failed: ${approvalPath} is not valid JSON.`, error);
  process.exit(1);
}

const packageJson = JSON.parse(packageRaw) as { version?: string };
const androidVersionName = androidBuild.match(/versionName\s+"([^"]+)"/)?.[1];
const androidVersionCode = Number(androidBuild.match(/versionCode\s+(\d+)/)?.[1]);

function requireCondition(condition: boolean, message: string) {
  if (condition) return;
  findings.push(message);
}

const evidenceRequirements: Array<{
  flag: ApprovalFlag;
  evidenceKey: EvidenceKey;
  instruction: string;
}> = [
  {
    flag: 'webVerificationPassed',
    evidenceKey: 'webVerification',
    instruction: 'Complete npm run verify in a working environment.',
  },
  {
    flag: 'androidUnitTestsPassed',
    evidenceKey: 'androidUnitTests',
    instruction: 'Run Android JUnit tests successfully.',
  },
  {
    flag: 'debugApkCompiled',
    evidenceKey: 'debugApk',
    instruction: 'Compile and inspect the debug APK.',
  },
  {
    flag: 'physicalDeviceMatrixPassed',
    evidenceKey: 'physicalDeviceMatrix',
    instruction: 'Complete the mandatory Android physical-device matrix.',
  },
  {
    flag: 'terminalLifecycleValidationPassed',
    evidenceKey: 'terminalLifecycle',
    instruction:
      'Validate notification-action, unexpected-destroy, stop-reason persistence, stale activation, Commitment, and adaptive-friction lifecycle scenarios on the exact candidate.',
  },
  {
    flag: 'batteryReliabilityPassed',
    evidenceKey: 'batteryReliability',
    instruction: 'Complete long-run battery and process-reliability testing.',
  },
  {
    flag: 'migrationValidationPassed',
    evidenceKey: 'migrationValidation',
    instruction: 'Validate V0.7 and previous-candidate data migration.',
  },
  {
    flag: 'playDeclarationsFinal',
    evidenceKey: 'playDeclarations',
    instruction: 'Finalize Play Console permission and foreground-service declarations.',
  },
  {
    flag: 'legalFieldsComplete',
    evidenceKey: 'legalFields',
    instruction: 'Replace all legal, address, support, and privacy-domain placeholders.',
  },
  {
    flag: 'reviewVideosRecorded',
    evidenceKey: 'reviewVideos',
    instruction: 'Record reviewer videos using this exact candidate build.',
  },
  {
    flag: 'signedBinaryInspected',
    evidenceKey: 'signedBinary',
    instruction: 'Inspect the final signed binary against privacy and store declarations.',
  },
];

requireCondition(approval.schemaVersion === 2, 'schemaVersion must equal 2.');
requireCondition(
  approval.candidateVersion === packageJson.version,
  `candidateVersion (${approval.candidateVersion}) must match package.json (${packageJson.version ?? 'missing'}).`,
);
requireCondition(
  approval.candidateVersion === androidVersionName,
  `candidateVersion (${approval.candidateVersion}) must match Android versionName (${androidVersionName ?? 'missing'}).`,
);
requireCondition(
  Number.isInteger(approval.candidateVersionCode) && approval.candidateVersionCode > 0,
  'candidateVersionCode must be a positive integer.',
);
requireCondition(
  approval.candidateVersionCode === androidVersionCode,
  `candidateVersionCode (${approval.candidateVersionCode}) must match Android versionCode (${Number.isFinite(androidVersionCode) ? androidVersionCode : 'missing'}).`,
);
requireCondition(
  typeof approval.candidateCommitSha === 'string' &&
    (approval.candidateCommitSha === '' || COMMIT_SHA_PATTERN.test(approval.candidateCommitSha)),
  'candidateCommitSha must be empty while unverified or an exact 40-character lowercase Git commit SHA.',
);

for (const { flag, evidenceKey } of evidenceRequirements) {
  requireCondition(typeof approval[flag] === 'boolean', `${flag} must be an explicit boolean.`);

  const record = approval.evidence?.[evidenceKey];
  requireCondition(
    !!record && typeof record.candidateCommitSha === 'string' && typeof record.reference === 'string',
    `evidence.${evidenceKey} must contain candidateCommitSha and reference strings.`,
  );
  if (!record || typeof record.candidateCommitSha !== 'string' || typeof record.reference !== 'string') continue;

  const evidenceSha = record.candidateCommitSha.trim();
  const reference = record.reference.trim();
  const recordHasContent = evidenceSha.length > 0 || reference.length > 0;

  requireCondition(
    evidenceSha === '' || COMMIT_SHA_PATTERN.test(evidenceSha),
    `evidence.${evidenceKey}.candidateCommitSha must be empty or a 40-character lowercase Git commit SHA.`,
  );
  requireCondition(
    reference.length <= EVIDENCE_REFERENCE_MAX_LENGTH,
    `evidence.${evidenceKey}.reference must be at most ${EVIDENCE_REFERENCE_MAX_LENGTH} characters.`,
  );
  requireCondition(
    !/[\u0000-\u001f\u007f]/.test(reference),
    `evidence.${evidenceKey}.reference must not contain control characters.`,
  );

  if (recordHasContent) {
    requireCondition(
      COMMIT_SHA_PATTERN.test(approval.candidateCommitSha),
      `candidateCommitSha must be fixed before storing evidence.${evidenceKey}.`,
    );
    requireCondition(
      evidenceSha === approval.candidateCommitSha,
      `evidence.${evidenceKey} must reference the same candidateCommitSha as the release manifest.`,
    );
    requireCondition(reference.length >= 3, `evidence.${evidenceKey}.reference must identify the retained evidence.`);
  }

  if (approval[flag] === true) {
    requireCondition(
      COMMIT_SHA_PATTERN.test(approval.candidateCommitSha),
      `${flag}=true requires a fixed candidateCommitSha.`,
    );
    requireCondition(
      evidenceSha === approval.candidateCommitSha && reference.length >= 3,
      `${flag}=true requires candidate-bound evidence.${evidenceKey}.`,
    );
  }
}

const blockers = evidenceRequirements
  .filter(({ flag }) => approval[flag] !== true)
  .map(({ instruction }) => instruction);

if (strict) {
  requireCondition(
    COMMIT_SHA_PATTERN.test(approval.candidateCommitSha),
    'Strict release approval requires the exact tested candidateCommitSha.',
  );
  requireCondition(blockers.length === 0, `Release evidence is incomplete:\n- ${blockers.join('\n- ')}`);
  requireCondition(
    approval.approvedBy.trim().length >= 3,
    'approvedBy must identify the person approving this exact release candidate.',
  );
  const approvedAt = Date.parse(approval.approvedAt);
  requireCondition(
    Number.isFinite(approvedAt) && approvedAt <= Date.now(),
    'approvedAt must be a valid non-future ISO date-time.',
  );

  if (COMMIT_SHA_PATTERN.test(approval.candidateCommitSha)) {
    const diff = spawnSync('git', ['diff', '--name-only', approval.candidateCommitSha, 'HEAD', '--'], {
      encoding: 'utf8',
    });
    requireCondition(
      diff.status === 0,
      'Strict gate could not compare candidateCommitSha with HEAD. Fetch the candidate commit/history before release approval.',
    );
    if (diff.status === 0) {
      const changedPaths = diff.stdout
        .split(/\r?\n/)
        .map((path) => path.trim())
        .filter(Boolean);
      const unauthorizedChanges = changedPaths.filter((path) => path !== approvalPath);
      requireCondition(
        unauthorizedChanges.length === 0,
        `Code or release content changed after the tested candidate. Retest a new candidate before approval. Changed paths:\n- ${unauthorizedChanges.join('\n- ')}`,
      );
    }
  }
}

if (findings.length > 0) {
  console.log(`Release approval ${strict ? 'gate' : 'schema check'} failed:\n`);
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

if (strict) {
  console.log(
    `Release gate passed for ScrollShield ${approval.candidateVersion} (${approval.candidateVersionCode}) at tested candidate ${approval.candidateCommitSha}, approved by ${approval.approvedBy}.`,
  );
} else {
  console.log(
    `Release approval schema passed for ${approval.candidateVersion} (${approval.candidateVersionCode}). ${blockers.length} evidence item(s) remain incomplete; evidence flags cannot become true without candidate-bound references.`,
  );
}
