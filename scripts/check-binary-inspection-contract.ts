import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const files = {
  packageJson: 'package.json',
  inspector: 'scripts/inspect-release-candidate.ts',
  finalArtifactCheck: 'scripts/check-release-candidate-artifact.ts',
  gitignore: '.gitignore',
};

const findings: string[] = [];
for (const file of Object.values(files)) {
  if (!existsSync(file)) findings.push(`Required binary-inspection contract file missing: ${file}`);
}

if (findings.length === 0) {
  const [packageRaw, inspector, finalArtifactCheck, gitignore] = await Promise.all([
    readFile(files.packageJson, 'utf8'),
    readFile(files.inspector, 'utf8'),
    readFile(files.finalArtifactCheck, 'utf8'),
    readFile(files.gitignore, 'utf8'),
  ]);
  const packageJson = JSON.parse(packageRaw) as { scripts?: Record<string, string> };

  if (packageJson.scripts?.['check:binary-inspection'] !== 'tsx scripts/check-binary-inspection-contract.ts') {
    findings.push('package.json: check:binary-inspection must execute the binary inspection contract guard.');
  }
  if (!packageJson.scripts?.verify?.includes('npm run check:binary-inspection')) {
    findings.push('package.json: verify must include check:binary-inspection.');
  }
  if (packageJson.scripts?.['android:inspect:candidate:release'] !== 'tsx scripts/inspect-release-candidate.ts apk') {
    findings.push('package.json: android:inspect:candidate:release must inspect the retained signed APK.');
  }
  if (packageJson.scripts?.['android:inspect:candidate:bundle'] !== 'tsx scripts/inspect-release-candidate.ts bundle') {
    findings.push('package.json: android:inspect:candidate:bundle must inspect the retained signed AAB.');
  }

  const requiredInspectorPatterns: Array<[RegExp, string]> = [
    [
      /allowedPermissions[\s\S]*RECEIVE_BOOT_COMPLETED[\s\S]*PACKAGE_USAGE_STATS[\s\S]*SYSTEM_ALERT_WINDOW/,
      'Inspector must keep an explicit permission allowlist.',
    ],
    [/android\.permission\.INTERNET/, 'Inspector must explicitly detect INTERNET permission.'],
    [/AD_ID|ACCESS_ADSERVICES_AD_ID/, 'Inspector must explicitly detect advertising identifier permissions.'],
    [/BUNDLETOOL_JAR/, 'AAB inspection must require an explicitly supplied reviewed bundletool jar.'],
    [/apkanalyzer/, 'APK inspection must use Android SDK apkanalyzer.'],
    [/createHash\('sha256'\)/, 'Inspector must bind inspection to the exact artifact SHA-256.'],
    [
      /status:\s*findings\.length === 0 \? 'passed' : 'failed'/,
      'Inspector report must fail closed when findings exist.',
    ],
    [/suspiciousArchiveMarkers/, 'Inspector must retain suspicious archive marker results.'],
  ];
  for (const [pattern, message] of requiredInspectorPatterns) {
    if (!pattern.test(inspector)) findings.push(`${files.inspector}: ${message}`);
  }

  const requiredFinalPatterns: Array<[RegExp, string]> = [
    [
      /inspectionPath[\s\S]*binary inspection report missing/i,
      'Final artifact validation must require the local inspection report.',
    ],
    [/inspection\.status === 'passed'/, 'Final artifact validation must require status=passed.'],
    [
      /inspection\.sha256 === metadataSha256/,
      'Final artifact validation must bind inspection to recorded artifact SHA-256.',
    ],
    [/actualHash === inspection\.sha256/, 'Final artifact validation must re-hash retained bytes against inspection.'],
    [
      /inspection\.candidateCommitSha === metadataCandidateSha/,
      'Final artifact validation must bind inspection to source candidate SHA.',
    ],
  ];
  for (const [pattern, message] of requiredFinalPatterns) {
    if (!pattern.test(finalArtifactCheck)) findings.push(`${files.finalArtifactCheck}: ${message}`);
  }

  if (!/^\.scrollshield-release-candidate\/$/m.test(gitignore)) {
    findings.push('.gitignore: local candidate and inspection evidence directory must remain ignored.');
  }
}

if (findings.length > 0) {
  console.log('Binary inspection contract check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Binary inspection contract passed. APK/AAB manifest inspection, permission allowlisting, artifact hashing, and final report binding are guarded.',
);
