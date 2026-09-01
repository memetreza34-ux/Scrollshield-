import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const lockfile = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const findings = [];

const root = lockfile.packages?.[''];

if (!root || typeof root !== 'object') {
  findings.push('package-lock.json is missing packages[""] root metadata.');
}

if ((lockfile.lockfileVersion ?? 0) < 3) {
  findings.push(
    `package-lock.json lockfileVersion must be at least 3; found ${lockfile.lockfileVersion ?? 'missing'}.`,
  );
}

if (lockfile.name !== manifest.name) {
  findings.push(
    `package-lock.json name (${lockfile.name ?? 'missing'}) does not match package.json (${manifest.name ?? 'missing'}).`,
  );
}

if (lockfile.version !== manifest.version) {
  findings.push(
    `package-lock.json version (${lockfile.version ?? 'missing'}) does not match package.json (${manifest.version ?? 'missing'}).`,
  );
}

if (root) {
  if (root.name !== manifest.name) {
    findings.push(
      `package-lock root name (${root.name ?? 'missing'}) does not match package.json (${manifest.name ?? 'missing'}).`,
    );
  }

  if (root.version !== manifest.version) {
    findings.push(
      `package-lock root version (${root.version ?? 'missing'}) does not match package.json (${manifest.version ?? 'missing'}).`,
    );
  }

  for (const section of ['dependencies', 'devDependencies']) {
    const expected = manifest[section] ?? {};
    const actual = root[section] ?? {};
    const names = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();

    for (const name of names) {
      if (expected[name] === actual[name]) continue;
      findings.push(
        `${section}.${name} differs: package.json=${expected[name] ?? '<missing>'}, package-lock.json=${actual[name] ?? '<missing>'}.`,
      );
    }
  }
}

if (findings.length > 0) {
  console.error('Package-lock synchronization check failed:\n');
  for (const finding of findings) console.error(`- ${finding}`);
  console.error('\nRegenerate package-lock.json with the intended npm version before committing.');
  process.exit(1);
}

console.log('Package-lock synchronization check passed. package.json and package-lock root metadata match.');
