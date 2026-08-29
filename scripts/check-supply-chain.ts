import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

type PackageJson = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type PackageLockEntry = {
  resolved?: string;
  version?: string;
};

type PackageLock = {
  lockfileVersion?: number;
  packages?: Record<string, PackageLockEntry>;
};

type Finding = { file: string; text: string };

const findings: Finding[] = [];

const requireFile = (file: string) => {
  if (!existsSync(file)) findings.push({ file, text: 'Required supply-chain file is missing.' });
};

for (const file of [
  'package.json',
  'package-lock.json',
  '.gitignore',
  'scripts/check-package-lock-sync.mjs',
  'scripts/run-local-verification.mjs',
  '.github/workflows/verify.yml',
  'android/gradle/wrapper/gradle-wrapper.properties',
]) {
  requireFile(file);
}

if (findings.length === 0) {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as PackageJson;
  const packageLock = JSON.parse(await readFile('package-lock.json', 'utf8')) as PackageLock;
  const gitignore = await readFile('.gitignore', 'utf8');
  const workflow = await readFile('.github/workflows/verify.yml', 'utf8');
  const lockSyncScript = await readFile('scripts/check-package-lock-sync.mjs', 'utf8');
  const localVerificationScript = await readFile('scripts/run-local-verification.mjs', 'utf8');
  const wrapper = await readFile('android/gradle/wrapper/gradle-wrapper.properties', 'utf8');

  const declaredDependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };

  const unsafeDeclaredVersion = /^(?:\*|latest(?:\.|$)|next(?:\.|$)|git\+|https?:|file:|link:)/i;
  for (const [name, version] of Object.entries(declaredDependencies)) {
    if (unsafeDeclaredVersion.test(version) || version.includes('github:')) {
      findings.push({
        file: 'package.json',
        text: `Dependency ${name} uses a non-registry or unbounded version specifier: ${version}`,
      });
    }
  }

  if (packageJson.scripts?.['check:lock-sync'] !== 'node scripts/check-package-lock-sync.mjs') {
    findings.push({
      file: 'package.json',
      text: 'check:lock-sync must execute the dependency-free package-lock preflight script.',
    });
  }

  if (packageJson.scripts?.['verify:local-evidence'] !== 'node scripts/run-local-verification.mjs') {
    findings.push({
      file: 'package.json',
      text: 'verify:local-evidence must execute the SHA-bound dependency-free local verification runner.',
    });
  }

  if (!packageJson.scripts?.verify?.includes('npm run check:lock-sync')) {
    findings.push({
      file: 'package.json',
      text: 'verify must include check:lock-sync so local verification detects package manifest/lock drift.',
    });
  }

  if (!/packages\?\.\[''\][\s\S]*dependencies[\s\S]*devDependencies/.test(lockSyncScript)) {
    findings.push({
      file: 'scripts/check-package-lock-sync.mjs',
      text: 'Lock preflight must compare package.json dependency sections with package-lock root metadata.',
    });
  }

  const localEvidenceRequirements = [
    ['git rev-parse HEAD', /rev-parse[\s\S]*HEAD/],
    ['clean tracked working tree', /status[\s\S]*--porcelain[\s\S]*--untracked-files=no/],
    ['ignored evidence directory', /\.scrollshield-verification/],
    ['fresh dependency install', /\['npm-ci'[\s\S]*\['ci'\]/],
    ['Android tooling check', /android-doctor[\s\S]*android:doctor/],
    ['complete source verification', /source-verify[\s\S]*\['run', 'verify'\]/],
    ['Android unit/debug build', /android-unit-debug-build[\s\S]*\['run', 'verify:android'\]/],
    ['explicit physical-device evidence boundary', /physical-device[\s\S]*remain separate/i],
  ] as const;

  for (const [label, pattern] of localEvidenceRequirements) {
    if (pattern.test(localVerificationScript)) continue;
    findings.push({
      file: 'scripts/run-local-verification.mjs',
      text: `Local evidence runner lost required contract: ${label}.`,
    });
  }

  if (!gitignore.split(/\r?\n/).includes('.scrollshield-verification/')) {
    findings.push({
      file: '.gitignore',
      text: 'Local verification logs must remain ignored so generated evidence cannot dirty the candidate tree.',
    });
  }

  const workflowLockCheckIndex = workflow.indexOf('node scripts/check-package-lock-sync.mjs');
  const workflowNpmCiIndex = workflow.indexOf('run: npm ci');
  if (workflowLockCheckIndex < 0 || workflowNpmCiIndex < 0 || workflowLockCheckIndex > workflowNpmCiIndex) {
    findings.push({
      file: '.github/workflows/verify.yml',
      text: 'Dependency-free package-lock validation must execute before npm ci.',
    });
  }

  if ((packageLock.lockfileVersion ?? 0) < 3) {
    findings.push({
      file: 'package-lock.json',
      text: `npm lockfileVersion must be at least 3; found ${packageLock.lockfileVersion ?? 'missing'}.`,
    });
  }

  for (const [packagePath, entry] of Object.entries(packageLock.packages ?? {})) {
    if (!entry.resolved) continue;
    if (entry.resolved.startsWith('http://')) {
      findings.push({
        file: 'package-lock.json',
        text: `Insecure HTTP package resolution found for ${packagePath || '<root>'}: ${entry.resolved}`,
      });
    }
    if (/^(?:git\+|git:|ssh:)/i.test(entry.resolved)) {
      findings.push({
        file: 'package-lock.json',
        text: `Git/SSH package resolution requires explicit review: ${packagePath || '<root>'}: ${entry.resolved}`,
      });
    }
  }

  const wrapperUrl = wrapper.match(/^distributionUrl=(.+)$/m)?.[1] ?? '';
  const wrapperChecksum = wrapper.match(/^distributionSha256Sum=([0-9a-f]{64})$/m)?.[1] ?? '';
  if (!wrapperUrl.startsWith('https\\://services.gradle.org/distributions/')) {
    findings.push({
      file: 'android/gradle/wrapper/gradle-wrapper.properties',
      text: `Gradle wrapper must use the official HTTPS distribution host; found ${wrapperUrl || 'missing'}.`,
    });
  }
  if (!wrapperChecksum) {
    findings.push({
      file: 'android/gradle/wrapper/gradle-wrapper.properties',
      text: 'Gradle distributionSha256Sum must be pinned to the official release checksum.',
    });
  }
  if (/gradle-8\.14\.3-all\.zip/.test(wrapperUrl)) {
    const expected = 'ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c';
    if (wrapperChecksum !== expected) {
      findings.push({
        file: 'android/gradle/wrapper/gradle-wrapper.properties',
        text: 'Gradle 8.14.3 all-distribution checksum does not match the official published SHA-256.',
      });
    }
  }

  const androidFiles = (await readdir('android', { recursive: true }))
    .filter((file) => /(?:\.gradle(?:\.kts)?|gradle\.properties)$/.test(file))
    .map((file) => path.join('android', file));

  for (const file of androidFiles) {
    const content = await readFile(file, 'utf8');
    if (/['"][^'"\n]+:[^'"\n]+:[^'"\n]*\+['"]/.test(content) || /latest\.release/i.test(content)) {
      findings.push({ file, text: 'Dynamic Gradle dependency version found; pin an explicit version.' });
    }
    if (/https?:\/\//.test(content) && /http:\/\//.test(content)) {
      findings.push({ file, text: 'Plain HTTP repository or dependency URL found in Gradle configuration.' });
    }
  }
}

if (findings.length > 0) {
  console.log('Supply-chain check failed:\n');
  for (const finding of findings) console.log(`- ${finding.file}: ${finding.text}`);
  process.exit(1);
}

console.log(
  'Supply-chain check passed. Lockfile preflight, SHA-bound local evidence, Gradle checksum, dependency protocols, and dynamic versions are guarded.',
);
