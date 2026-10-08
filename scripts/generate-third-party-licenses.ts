import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Writes dist/third-party-licenses.txt with the full license text of every
 * package shipped in the app. MIT, ISC and 0BSD require the copyright and
 * permission notice to travel with the software; THIRD_PARTY_NOTICES.md only
 * lists names. The app links the file under "Open-Source-Lizenzen".
 *
 * Shipped packages are the lockfile entries not marked dev: everything the
 * runtime dependencies pull in, nothing from the build tooling.
 */

type LockPackage = { version?: string; license?: string; dev?: boolean; devOptional?: boolean };

const lock = JSON.parse(await readFile('package-lock.json', 'utf8')) as { packages: Record<string, LockPackage> };
const licenseFilePattern = /^(?:licen[cs]e|copying)(?:\.(?:md|txt))?$/i;

const shipped = Object.entries(lock.packages)
  .filter(([location, entry]) => location.startsWith('node_modules/') && !entry.dev && !entry.devOptional)
  .map(([location, entry]) => ({
    location,
    name: location.slice(location.lastIndexOf('node_modules/') + 'node_modules/'.length),
    entry,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const sections: string[] = [];
const missing: string[] = [];

for (const { location, name, entry } of shipped) {
  const files = await readdir(location).catch(() => [] as string[]);
  const licenseFile = files.find((file) => licenseFilePattern.test(file));
  if (!licenseFile) {
    missing.push(name);
    continue;
  }
  const text = (await readFile(path.join(location, licenseFile), 'utf8')).trim();
  const title = `${name} ${entry.version ?? ''} (${entry.license ?? 'siehe Lizenztext'})`.replace(/\s+\(/, ' (');
  sections.push(`${title}\n${'-'.repeat(title.length)}\n\n${text}`);
}

if (missing.length > 0) {
  throw new Error(`No license file found for shipped packages: ${missing.join(', ')}`);
}

const apache = (await readFile('scripts/licenses/apache-2.0.txt', 'utf8')).trim();
const android = [
  'Android-App: Bibliotheken unter der Apache License 2.0',
  '---------------------------------------------------------',
  '',
  'AndroidX (activity, appcompat, coordinatorlayout, core, core-splashscreen, fragment,',
  'security-crypto, webkit) und Google Tink – Google LLC',
  'Apache Cordova Android Framework – The Apache Software Foundation',
  'Kotlin-Standardbibliothek – JetBrains s.r.o.',
  '',
  apache,
].join('\n');

const header = [
  'ScrollShield – Lizenzen von Drittanbietern',
  '',
  'ScrollShield enthält die folgende Open-Source-Software. Die Lizenztexte stehen unverändert',
  'so, wie die Projekte sie veröffentlichen.',
].join('\n');

const separator = `\n\n${'='.repeat(80)}\n\n`;
await writeFile('dist/third-party-licenses.txt', [header, ...sections, android].join(separator) + '\n');

console.log(`Third-party licenses written: ${sections.length} packages plus Android libraries.`);
