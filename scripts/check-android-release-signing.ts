import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const signingPropertiesPath = path.join('android', 'signing.properties');
const findings: string[] = [];

if (!existsSync(signingPropertiesPath)) {
  findings.push(
    `${signingPropertiesPath} is missing. Production release APK/AAB generation requires an explicit local signing configuration.`,
  );
} else {
  const raw = readFileSync(signingPropertiesPath, 'utf8');
  const values = new Map<string, string>();

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    values.set(trimmed.slice(0, separator).trim(), trimmed.slice(separator + 1).trim());
  }

  for (const key of ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']) {
    if ((values.get(key) ?? '').length > 0) continue;
    findings.push(`${signingPropertiesPath} must contain a non-empty ${key}=... entry.`);
  }

  const storeFile = values.get('storeFile');
  if (storeFile) {
    if (path.isAbsolute(storeFile)) {
      findings.push('storeFile must be a repository-local path under android/, not an absolute path.');
    } else {
      const normalized = path.normalize(storeFile);
      if (normalized.startsWith(`..${path.sep}`) || normalized === '..') {
        findings.push('storeFile must not escape the android/ directory.');
      } else {
        const resolved = path.join('android', normalized);
        if (!existsSync(resolved)) {
          findings.push(`Configured signing keystore does not exist at ${resolved}.`);
        }
      }
    }
  }
}

if (findings.length > 0) {
  console.log('Android release signing check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log('Android release signing check passed. Local signing properties and keystore are present.');
