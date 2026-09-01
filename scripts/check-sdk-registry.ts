import { readFile } from 'node:fs/promises';

type PackageJson = {
  dependencies?: Record<string, string>;
};

const [packageRaw, registry, androidBuild] = await Promise.all([
  readFile('package.json', 'utf8'),
  readFile('docs/SDK_REGISTRY.md', 'utf8'),
  readFile('android/app/build.gradle', 'utf8'),
]);

const packageJson = JSON.parse(packageRaw) as PackageJson;
const webRuntimeDependencies = Object.keys(packageJson.dependencies ?? {});
const androidRuntimeDependencies = [...androidBuild.matchAll(/implementation\s+"([^"\n]+)"/g)]
  .map((match) => match[1])
  .map((coordinate) => coordinate.split(':').slice(0, 2).join(':'))
  .filter((coordinate) => coordinate.split(':').length === 2);

const expectedDependencies = [...new Set([...webRuntimeDependencies, ...androidRuntimeDependencies])].sort();
const registeredDependencies = [...registry.matchAll(/\| `([^`]+)`/g)].map((match) => match[1]).sort();
const findings: string[] = [];

for (const dependency of expectedDependencies) {
  if (registeredDependencies.includes(dependency)) continue;
  findings.push(`Direct production runtime dependency ${dependency} is missing from docs/SDK_REGISTRY.md.`);
}

for (const dependency of registeredDependencies) {
  if (expectedDependencies.includes(dependency)) continue;
  findings.push(`docs/SDK_REGISTRY.md lists ${dependency}, but it is not a direct production runtime dependency.`);
}

if (
  !registry.includes('com.android.billingclient:billing') ||
  !registry.includes('com.google.android.play:integrity')
) {
  findings.push(
    'SDK registry must explicitly disclose Google Play Billing and Play Integrity while they are shipped in the Android binary.',
  );
}
if (!/Billing and Play Integrity libraries are \*\*still embedded direct Android runtime SDKs\*\*/.test(registry)) {
  findings.push('SDK registry must distinguish no-INTERNET-permission from the presence of Google Play platform SDKs.');
}

if (findings.length > 0) {
  console.log('SDK registry check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  `SDK registry check passed. ${webRuntimeDependencies.length} web/Capacitor and ${androidRuntimeDependencies.length} direct Android Maven runtime dependencies are documented.`,
);
