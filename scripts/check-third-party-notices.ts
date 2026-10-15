import { readFile } from 'node:fs/promises';
import path from 'node:path';

type PackageJson = {
  dependencies?: Record<string, string>;
  license?: string;
};

const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as PackageJson;
const notices = await readFile('THIRD_PARTY_NOTICES.md', 'utf8');
const runtimeDependencies = Object.keys(packageJson.dependencies ?? {}).sort();
// OFL-1.1 is for fonts only: it allows bundling them with any app.
const allowedLicenses = new Set(['MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'OFL-1.1']);
const findings: string[] = [];

for (const dependency of runtimeDependencies) {
  const dependencyPackagePath = path.join('node_modules', ...dependency.split('/'), 'package.json');
  const dependencyPackage = JSON.parse(await readFile(dependencyPackagePath, 'utf8')) as PackageJson;
  const license = dependencyPackage.license;

  if (!license) {
    findings.push(`${dependency} does not declare a license.`);
    continue;
  }

  if (!allowedLicenses.has(license)) {
    findings.push(`${dependency} uses unreviewed license ${license}.`);
  }

  const escapedDependency = dependency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedLicense = license.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const noticePattern = new RegExp('\\| `' + escapedDependency + '`\\s+\\| ' + escapedLicense + '\\s+\\|');

  if (!noticePattern.test(notices)) {
    findings.push(`${dependency} (${license}) is missing or incorrect in THIRD_PARTY_NOTICES.md.`);
  }
}

if (findings.length > 0) {
  console.log('Third-party notice check failed:\n');
  for (const finding of findings) {
    console.log(`- ${finding}`);
  }
  process.exit(1);
}

console.log(`Third-party notice check passed. ${runtimeDependencies.length} runtime dependencies documented.`);
