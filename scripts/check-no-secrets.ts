import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { apiKeyPatterns } from './secret-patterns';

type Finding = {
  file: string;
  reason: string;
};

const gitResult = spawnSync('git', ['ls-files'], { encoding: 'utf8' });

if (gitResult.status !== 0) {
  throw new Error(`Unable to list tracked files: ${gitResult.stderr || 'git ls-files failed'}`);
}

const trackedFiles = gitResult.stdout
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean);

const forbiddenPathPatterns = [
  { pattern: /^android\/local\.properties$/i, reason: 'Android SDK paths are local machine configuration.' },
  { pattern: /^android\/signing\.properties$/i, reason: 'Android signing passwords must stay local.' },
  { pattern: /(^|\/)google-services\.json$/i, reason: 'Firebase service config must be intentionally reviewed.' },
  { pattern: /(^|\/)firebase-applet-config\.json$/i, reason: 'Firebase web config carries an API key.' },
  { pattern: /\.(?:jks|keystore)$/i, reason: 'Android keystores must not be committed.' },
  { pattern: /^\.env(?!\.example$)/i, reason: 'Environment files may contain secrets.' },
];

const forbiddenContentPatterns = [
  { pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/i, reason: 'Private key material found.' },
  { pattern: /^storePassword\s*=/im, reason: 'Android signing store password found.' },
  { pattern: /^keyPassword\s*=/im, reason: 'Android signing key password found.' },
  ...apiKeyPatterns,
];

const textFilePattern = /\.(?:cjs|css|gradle|html|js|json|jsx|kt|kts|md|mjs|properties|pro|ts|tsx|txt|xml|yaml|yml)$/i;
const contentScanExclusions = [/\.example$/i, /^docs\//i, /^package-lock\.json$/i];
const findings: Finding[] = [];

for (const file of trackedFiles) {
  for (const { pattern, reason } of forbiddenPathPatterns) {
    if (!pattern.test(file)) continue;
    findings.push({ file, reason });
  }

  if (!textFilePattern.test(file) || contentScanExclusions.some((pattern) => pattern.test(file))) continue;
  if (!existsSync(file)) continue;

  const content = readFileSync(file, 'utf8');
  for (const { pattern, reason } of forbiddenContentPatterns) {
    if (!pattern.test(content)) continue;
    findings.push({ file, reason });
  }
}

if (findings.length > 0) {
  console.log('Secret and local-file check failed:\n');
  for (const finding of findings) {
    console.log(`- ${finding.file}: ${finding.reason}`);
  }
  process.exit(1);
}

console.log(`Secret and local-file check passed. ${trackedFiles.length} tracked files scanned.`);
