import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

type Finding = {
  file: string;
  line: number;
  label: string;
  text: string;
};

const strict = process.argv.includes('--strict');
const repoRoot = process.cwd();
const findings: Finding[] = [];

const releaseScreenFiles = readdirSync(path.join(repoRoot, 'src/screens'))
  .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx') && file !== 'DebugScreen.tsx')
  .map((file) => `src/screens/${file}`);

const checks = [
  {
    label: 'Legal details required',
    pattern: /Angaben vor Release|Musterstra|Max Mustermann/i,
    files: ['src/screens/SupportScreen.tsx'],
  },
  {
    label: 'Unfinished release UI',
    pattern: /Lorem Ipsum|Coming Soon|Demnächst|TODO|FIXME|Beispieltext|Testdaten/i,
    files: releaseScreenFiles,
  },
  {
    label: 'Unverified support domain',
    pattern: /support@scrollshield\.app/i,
    files: ['src/lib/contact.ts', 'src/screens/SupportScreen.tsx', 'docs/RELEASE_CHECKLIST.md'],
  },
  {
    label: 'Risky store claim',
    pattern:
      /100%\s*(?:unumgehbar|offline)|unumgehbar|unüberwind|kompromisslos|komplett\s+blockier|blockiert\s+alles|garantiert\s+block|sofort\s+(?:und\s+)?(?:strikt\s+)?block|ohne\s+Ausnahme\s+block|nichts\s+wird\s+je|social media addiction/i,
    files: [...releaseScreenFiles, 'src/types.tsx', 'docs/STORE_LISTING_COPY.md', 'metadata.json', 'README.md'],
  },
  {
    label: 'Release UI references Accessibility API',
    pattern: /Bedienungshilfen|Accessibility Services|Accessibility API/i,
    files: ['src/screens/PermissionsScreen.tsx', 'src/screens/ConfigScreens.tsx'],
  },
  {
    label: 'Obsolete EU ODR platform link',
    pattern: /ec\.europa\.eu\/consumers\/odr|Online-Streitbeilegung/i,
    files: ['src/screens/SupportScreen.tsx', 'public/privacy.html'],
  },
  {
    label: 'Obsolete release documentation',
    pattern:
      /Berechtigungs-Minimum[^\n]*nur\s+Internet|Best-Effort[^\n]*(?:Reels|Shorts)|ADHS[^\n]*(?:Zielgruppe|Forum)|TestFlight[^\n]*iOS/i,
    files: [
      'docs/RELEASE_CHECKLIST.md',
      'docs/ROLLOUT_PLAN.md',
      'docs/STORE_REVIEW_RISKS.md',
      'docs/RELEASE_WORK_IN_PROGRESS.md',
    ],
  },
];

function readFile(file: string): string {
  return readFileSync(path.join(repoRoot, file), 'utf8');
}

function addFinding(file: string, label: string, text: string, line = 1) {
  findings.push({ file, line, label, text });
}

for (const check of checks) {
  for (const file of check.files) {
    const absolutePath = path.join(repoRoot, file);
    if (!existsSync(absolutePath)) {
      addFinding(file, 'Missing release file', `Required release file is missing: ${file}.`);
      continue;
    }

    const lines = readFileSync(absolutePath, 'utf8').split(/\r?\n/);
    lines.forEach((lineText, index) => {
      if (!check.pattern.test(lineText)) return;
      addFinding(file, check.label, lineText.trim(), index + 1);
    });
  }
}

const privacyPolicyPath = 'public/privacy.html';
const storeCopyPath = 'docs/STORE_LISTING_COPY.md';
const storePacketPath = 'docs/STORE_SUBMISSION_PACKET.md';
const deviceMatrixPath = 'docs/ANDROID_DEVICE_TEST_MATRIX.md';
const approvalPath = 'config/release-approval.json';

for (const requiredPath of [privacyPolicyPath, storeCopyPath, storePacketPath, deviceMatrixPath, approvalPath]) {
  if (existsSync(path.join(repoRoot, requiredPath))) continue;
  addFinding(requiredPath, 'Missing release artifact', `Create ${requiredPath} before release verification.`);
}

if (existsSync(path.join(repoRoot, storeCopyPath))) {
  const storeCopy = readFile(storeCopyPath);
  const requiredStoreSignals = [
    { label: 'self-control positioning', pattern: /Werkzeug zur Selbstkontrolle/i },
    { label: 'whole-app version-one disclosure', pattern: /Version 1\.0[\s\S]*Schutz ganzer ausgewählter Apps/i },
    { label: 'non-medical disclaimer', pattern: /kein medizinisches Produkt/i },
    { label: 'focus keyword', pattern: /\bFokus\b/i },
    { label: 'screen-time keyword', pattern: /\bBildschirmzeit\b/i },
    { label: 'digital-wellbeing keyword', pattern: /\bDigital Wellbeing\b/i },
    { label: 'procrastination keyword', pattern: /\bProkrastination\b/i },
  ];

  for (const signal of requiredStoreSignals) {
    if (signal.pattern.test(storeCopy)) continue;
    addFinding(storeCopyPath, 'Incomplete store listing copy', `Missing ${signal.label}.`);
  }

  const appleReviewCopy = storeCopy.match(/## Review Notes - Apple([\s\S]*?)(?=## Review Notes - Google Play|$)/i)?.[1];
  if (!appleReviewCopy || /\b(?:Android|Overlay|SYSTEM_ALERT_WINDOW|Android-Blocker)\b/i.test(appleReviewCopy)) {
    addFinding(
      storeCopyPath,
      'Unsafe Apple review wording',
      'Apple review notes must exist and remain free of Android-only terminology.',
    );
  }
}

const androidManifestPath = 'android/app/src/main/AndroidManifest.xml';
if (existsSync(path.join(repoRoot, androidManifestPath))) {
  const androidManifest = readFile(androidManifestPath);

  if (!/android:allowBackup="false"/i.test(androidManifest)) {
    addFinding(
      androidManifestPath,
      'Android backup must stay disabled',
      'Set android:allowBackup="false" so local wellbeing data is not included in device backups.',
    );
  }

  if (!/android:usesCleartextTraffic="false"/i.test(androidManifest)) {
    addFinding(
      androidManifestPath,
      'Android cleartext traffic must stay disabled',
      'Set android:usesCleartextTraffic="false" before release.',
    );
  }

  const forbiddenPermissions = [
    'android.permission.BIND_ACCESSIBILITY_SERVICE',
    'android.permission.QUERY_ALL_PACKAGES',
    'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  ];

  for (const permission of forbiddenPermissions) {
    if (!androidManifest.includes(permission)) continue;
    addFinding(
      androidManifestPath,
      'Forbidden or unapproved Android permission',
      `${permission} is outside the approved version-one permission scope.`,
    );
  }

  if (existsSync(path.join(repoRoot, storePacketPath))) {
    const storePacket = readFile(storePacketPath);
    const declarationRequirements = [
      {
        permission: 'android.permission.PACKAGE_USAGE_STATS',
        pattern: /### `PACKAGE_USAGE_STATS` Declaration/,
        label: '`PACKAGE_USAGE_STATS` declaration',
      },
      {
        permission: 'android.permission.SYSTEM_ALERT_WINDOW',
        pattern: /### `SYSTEM_ALERT_WINDOW` Declaration/,
        label: '`SYSTEM_ALERT_WINDOW` declaration',
      },
      {
        permission: 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
        pattern: /### `FOREGROUND_SERVICE_SPECIAL_USE` Declaration/,
        label: '`FOREGROUND_SERVICE_SPECIAL_USE` declaration',
      },
    ];

    for (const requirement of declarationRequirements) {
      if (!androidManifest.includes(requirement.permission) || requirement.pattern.test(storePacket)) continue;
      addFinding(
        storePacketPath,
        'Missing sensitive-permission declaration',
        `The manifest uses ${requirement.permission}, but ${requirement.label} is missing.`,
      );
    }
  }
}

const androidBuildGradlePath = 'android/app/build.gradle';
if (existsSync(path.join(repoRoot, androidBuildGradlePath))) {
  const androidBuildGradle = readFile(androidBuildGradlePath);

  if (!/minifyEnabled\s+true/i.test(androidBuildGradle)) {
    addFinding(
      androidBuildGradlePath,
      'Android release minification must stay enabled',
      'Set minifyEnabled true in the release build type before store submission.',
    );
  }

  if (!/shrinkResources\s+true/i.test(androidBuildGradle)) {
    addFinding(
      androidBuildGradlePath,
      'Android release resource shrinking must stay enabled',
      'Set shrinkResources true in the release build type before store submission.',
    );
  }
}

const packagePath = 'package.json';
if (existsSync(path.join(repoRoot, packagePath))) {
  const packageJson = JSON.parse(readFile(packagePath)) as { scripts?: Record<string, string> };
  const scripts = packageJson.scripts ?? {};

  for (const releaseCommand of ['android:release', 'android:bundle']) {
    if (scripts[releaseCommand]?.includes('release:gate')) continue;
    addFinding(
      packagePath,
      'Release command bypasses approval gate',
      `${releaseCommand} must execute release:gate before Gradle.`,
    );
  }

  const verifyCommand = scripts.verify ?? '';
  for (const requiredCheck of ['check:device-matrix', 'check:release-approval', 'check:transparency']) {
    if (verifyCommand.includes(requiredCheck)) continue;
    addFinding(packagePath, 'Incomplete verification chain', `npm run verify must include ${requiredCheck}.`);
  }
}

if (findings.length === 0) {
  console.log('Release readiness: no source or declaration inconsistencies found.');
  process.exit(0);
}

console.log('Release readiness: manual blockers or source inconsistencies still need attention.\n');

for (const finding of findings) {
  console.log(`- ${finding.label}: ${finding.file}:${finding.line}`);
  console.log(`  ${finding.text}`);
}

console.log(
  strict
    ? '\nStrict mode failed because release blockers are still present.'
    : '\nNon-strict mode reports blockers only. The separate release:gate enforces candidate evidence before release output.',
);

if (strict) process.exit(1);
