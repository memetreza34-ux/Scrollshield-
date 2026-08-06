import { readFile } from 'node:fs/promises';

type PackageJson = {
  dependencies?: Record<string, string>;
};

const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as PackageJson;
const registry = await readFile('docs/SDK_REGISTRY.md', 'utf8');
const runtimeDependencies = Object.keys(packageJson.dependencies ?? {}).sort();
const registeredDependencies = [...registry.matchAll(/\| `([^`]+)`/g)].map((match) => match[1]).sort();
const findings: string[] = [];

for (const dependency of runtimeDependencies) {
  if (registeredDependencies.includes(dependency)) continue;
  findings.push(`Runtime dependency ${dependency} is missing from docs/SDK_REGISTRY.md.`);
}

for (const dependency of registeredDependencies) {
  if (runtimeDependencies.includes(dependency)) continue;
  findings.push(`docs/SDK_REGISTRY.md lists ${dependency}, but it is not a runtime dependency.`);
}

if (findings.length > 0) {
  console.log('SDK registry check failed:\n');
  for (const finding of findings) {
    console.log(`- ${finding}`);
  }
  process.exit(1);
}

console.log(`SDK registry check passed. ${runtimeDependencies.length} runtime dependencies documented.`);
