import { readFile } from 'node:fs/promises';

interface ReleaseApproval {
  schemaVersion: number;
  candidateVersion: string;
  candidateVersionCode: number;
  webVerificationPassed: boolean;
  androidUnitTestsPassed: boolean;
  debugApkCompiled: boolean;
  physicalDeviceMatrixPassed: boolean;
  batteryReliabilityPassed: boolean;
  migrationValidationPassed: boolean;
  playDeclarationsFinal: boolean;
  legalFieldsComplete: boolean;
  reviewVideosRecorded: boolean;
  signedBinaryInspected: boolean;
  approvedBy: string;
  approvedAt: string;
}

const strict = process.argv.includes('--strict');
const approvalPath = 'config/release-approval.json';
const packagePath = 'package.json';
const androidBuildPath = 'android/app/build.gradle';

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

requireCondition(approval.schemaVersion === 1, 'schemaVersion must equal 1.');
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

const approvalFlags: Array<[keyof ReleaseApproval, string]> = [
  ['webVerificationPassed', 'Complete npm run verify in a working environment.'],
  ['androidUnitTestsPassed', 'Run Android JUnit tests successfully.'],
  ['debugApkCompiled', 'Compile and inspect the debug APK.'],
  ['physicalDeviceMatrixPassed', 'Complete the mandatory Android physical-device matrix.'],
  ['batteryReliabilityPassed', 'Complete long-run battery and process-reliability testing.'],
  ['migrationValidationPassed', 'Validate V0.7 and previous-candidate data migration.'],
  ['playDeclarationsFinal', 'Finalize Play Console permission and foreground-service declarations.'],
  ['legalFieldsComplete', 'Replace all legal, address, support, and privacy-domain placeholders.'],
  ['reviewVideosRecorded', 'Record reviewer videos using this exact candidate build.'],
  ['signedBinaryInspected', 'Inspect the final signed binary against privacy and store declarations.'],
];

const blockers = approvalFlags
  .filter(([key]) => approval[key] !== true)
  .map(([, instruction]) => instruction);

if (strict) {
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
}

if (findings.length > 0) {
  console.log(`Release approval ${strict ? 'gate' : 'schema check'} failed:\n`);
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

if (strict) {
  console.log(
    `Release gate passed for ScrollShield ${approval.candidateVersion} (${approval.candidateVersionCode}), approved by ${approval.approvedBy}.`,
  );
} else {
  console.log(
    `Release approval schema passed for ${approval.candidateVersion} (${approval.candidateVersionCode}). ${blockers.length} evidence item(s) remain incomplete.`,
  );
}
