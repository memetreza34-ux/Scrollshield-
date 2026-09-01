import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

type Finding = {
  file: string;
  text: string;
};

const findings: Finding[] = [];

function requireText(file: string, content: string, pattern: RegExp, text: string) {
  if (pattern.test(content)) return;
  findings.push({ file, text });
}

const listingPath = 'docs/STORE_LISTING_COPY.md';
const packetPath = 'docs/STORE_SUBMISSION_PACKET.md';
const privacyLabelsPath = 'STORE_PRIVACY_LABELS.md';
const publicPrivacyPath = 'public/privacy.html';
const screenshotsDir = path.join('docs', 'store-assets');

const listing = await readFile(listingPath, 'utf8');
const packet = await readFile(packetPath, 'utf8');
const privacyLabels = await readFile(privacyLabelsPath, 'utf8');
const publicPrivacy = await readFile(publicPrivacyPath, 'utf8');

requireText(listingPath, listing, /## Kurzbeschreibung/i, 'Missing short description.');
requireText(listingPath, listing, /## Lange Beschreibung/i, 'Missing long description.');
requireText(listingPath, listing, /## Keywords/i, 'Missing keyword section.');
requireText(listingPath, listing, /## Screenshot-Texte/i, 'Missing screenshot text section.');
requireText(listingPath, listing, /## Review Notes - Apple/i, 'Missing Apple review notes.');
requireText(listingPath, listing, /## Review Notes - Google Play/i, 'Missing Google Play review notes.');
requireText(listingPath, listing, /Werkzeug zur\s+Selbstkontrolle/i, 'Missing self-control positioning.');
requireText(
  listingPath,
  listing,
  /Version 1\.0[\s\S]*Schutz ganzer ausgewählter Apps/i,
  'Missing explicit version-one whole-app scope.',
);
requireText(listingPath, listing, /kein medizinisches Produkt/i, 'Missing non-medical product disclaimer.');
requireText(listingPath, listing, /keinen Cloud-Sync, keine Werbung und kein Tracking/i, 'Missing privacy promise.');

const riskyClaimPattern =
  /100%\s*(?:unumgehbar|offline)|unumgehbar|un.berwind|komplett\s+blockier|garantiert\s+block|ohne\s+Ausnahme\s+block/i;
if (riskyClaimPattern.test(listing)) {
  findings.push({
    file: listingPath,
    text: 'Store listing contains risky guarantee or absolute blocker wording.',
  });
}

requireText(packetPath, packet, /Data collected:\s+\*\*No\*\*/i, 'Missing App Store data collection answer.');
requireText(packetPath, packet, /Data shared:\s+\*\*No\*\*/i, 'Missing Play Console data sharing answer.');
requireText(packetPath, packet, /Tracking:\s+\*\*No\*\*/i, 'Missing tracking answer.');
requireText(packetPath, packet, /PACKAGE_USAGE_STATS/i, 'Missing Usage Access declaration draft.');
requireText(packetPath, packet, /SYSTEM_ALERT_WINDOW/i, 'Missing overlay declaration draft.');
requireText(
  packetPath,
  packet,
  /FOREGROUND_SERVICE_SPECIAL_USE/i,
  'Missing special-use foreground-service declaration draft.',
);
requireText(packetPath, packet, /USK 0 \/ PEGI 3/i, 'Missing Google rating target.');
requireText(packetPath, packet, /Target:\s+\*\*4\+\*\*/i, 'Missing Apple rating target.');

requireText(
  privacyLabelsPath,
  privacyLabels,
  /Daten werden vom Entwickler erhoben:\s+\*\*Nein\*\*/i,
  'Missing Apple no-data guidance.',
);
requireText(
  privacyLabelsPath,
  privacyLabels,
  /Daten werden mit Dritten geteilt:\s+\*\*Nein\*\*/i,
  'Missing Play no-sharing guidance.',
);
requireText(
  privacyLabelsPath,
  privacyLabels,
  /Daten werden f.{1,8}r Tracking genutzt:\s+\*\*Nein\*\*/i,
  'Missing no-tracking guidance.',
);
requireText(
  privacyLabelsPath,
  privacyLabels,
  /Account-Erstellung:\s+\*\*Nicht vorhanden\*\*/i,
  'Missing no-account guidance.',
);

requireText(
  publicPrivacyPath,
  publicPrivacy,
  /keinen Account, keinen Cloud-Sync/i,
  'Public privacy page must state no account/cloud sync.',
);
requireText(
  publicPrivacyPath,
  publicPrivacy,
  /keine Werbe-SDKs, keine Datenbroker-SDKs/i,
  'Public privacy page must state no ad/data-broker SDKs.',
);
requireText(
  publicPrivacyPath,
  publicPrivacy,
  /lokal gespeicherten ScrollShield-Daten/i,
  'Public privacy page must describe local export/reset data.',
);

const screenshotFiles = (await readdir(screenshotsDir)).filter((file) => /^\d{2}-.+\.png$/i.test(file)).sort();

if (screenshotFiles.length < 6) {
  findings.push({
    file: screenshotsDir,
    text: `Expected at least 6 numbered PNG screenshots, found ${screenshotFiles.length}.`,
  });
}

for (const file of screenshotFiles) {
  const screenshotPath = path.join(screenshotsDir, file);
  const metadata = await sharp(screenshotPath).metadata();

  if (metadata.format !== 'png') {
    findings.push({ file: screenshotPath, text: `Expected PNG format, found ${metadata.format ?? 'unknown'}.` });
  }

  if (metadata.width !== 430 || metadata.height !== 932) {
    findings.push({
      file: screenshotPath,
      text: `Expected 430x932 screenshot, found ${metadata.width ?? '?'}x${metadata.height ?? '?'}.`,
    });
  }
}

if (findings.length > 0) {
  console.log('Store asset check failed:\n');
  for (const finding of findings) {
    console.log(`- ${finding.file}: ${finding.text}`);
  }
  process.exit(1);
}

console.log(`Store asset check passed. ${screenshotFiles.length} screenshots validated.`);
