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
    files: ['src/lib/contact.ts', 'src/screens/SupportScreen.tsx', 'docs/RELEASE_CHECKLIST.md', 'docs/ROLLOUT_PLAN.md'],
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
];

function findMatches(): Finding[] {
  const findings: Finding[] = [];

  for (const check of checks) {
    for (const file of check.files) {
      const absolutePath = path.join(repoRoot, file);
      const content = readFileSync(absolutePath, 'utf-8');
      const lines = content.split(/\r?\n/);

      lines.forEach((lineText, index) => {
        if (!check.pattern.test(lineText)) return;

        findings.push({
          file,
          line: index + 1,
          label: check.label,
          text: lineText.trim(),
        });
      });
    }
  }

  return findings;
}

const findings = findMatches();
const privacyPolicyPath = path.join(repoRoot, 'public/privacy.html');
const storeCopyPath = path.join(repoRoot, 'docs/STORE_LISTING_COPY.md');

if (!existsSync(privacyPolicyPath)) {
  findings.push({
    file: 'public/privacy.html',
    line: 1,
    label: 'Missing public privacy policy',
    text: 'Create a static privacy policy page for App Store / Play Store review.',
  });
}

if (!existsSync(storeCopyPath)) {
  findings.push({
    file: 'docs/STORE_LISTING_COPY.md',
    line: 1,
    label: 'Missing store listing copy',
    text: 'Create reviewed store copy before submission.',
  });
} else {
  const storeCopy = readFileSync(storeCopyPath, 'utf-8');
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
    findings.push({
      file: 'docs/STORE_LISTING_COPY.md',
      line: 1,
      label: 'Incomplete store listing copy',
      text: `Missing ${signal.label}.`,
    });
  }

  const appleReviewCopy = storeCopy.match(/## Review Notes - Apple([\s\S]*?)(?=## Review Notes - Google Play|$)/i)?.[1];
  if (!appleReviewCopy || /\b(?:Android|Overlay|SYSTEM_ALERT_WINDOW|Android-Blocker)\b/i.test(appleReviewCopy)) {
    findings.push({
      file: 'docs/STORE_LISTING_COPY.md',
      line: 1,
      label: 'Unsafe Apple review wording',
      text: 'Apple review notes must exist and remain free of Android-only terminology.',
    });
  }
}

const androidManifestPath = path.join(repoRoot, 'android/app/src/main/AndroidManifest.xml');
if (existsSync(androidManifestPath)) {
  const androidManifest = readFileSync(androidManifestPath, 'utf-8');
  const sensitiveAndroidPermissions = [
    'android.permission.PACKAGE_USAGE_STATS',
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.BIND_ACCESSIBILITY_SERVICE',
    'android.permission.QUERY_ALL_PACKAGES',
    'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  ];

  if (/BIND_ACCESSIBILITY_SERVICE/i.test(androidManifest)) {
    findings.push({
      file: 'android/app/src/main/AndroidManifest.xml',
      line: 1,
      label: 'Forbidden Android accessibility service',
      text: 'Remove BIND_ACCESSIBILITY_SERVICE before release.',
    });
  }

  if (!/android:allowBackup="false"/i.test(androidManifest)) {
    findings.push({
      file: 'android/app/src/main/AndroidManifest.xml',
      line: 1,
      label: 'Android backup must stay disabled',
      text: 'Set android:allowBackup="false" so local wellbeing data is not included in device backups.',
    });
  }

  if (!/android:usesCleartextTraffic="false"/i.test(androidManifest)) {
    findings.push({
      file: 'android/app/src/main/AndroidManifest.xml',
      line: 1,
      label: 'Android cleartext traffic must stay disabled',
      text: 'Set android:usesCleartextTraffic="false" before release.',
    });
  }

  for (const permission of sensitiveAndroidPermissions) {
    if (!androidManifest.includes(permission)) continue;
    findings.push({
      file: 'android/app/src/main/AndroidManifest.xml',
      line: 1,
      label: 'Sensitive Android permission requires deliberate release approval',
      text: `${permission} must only be added with native implementation, store declaration, and review video evidence.`,
    });
  }
}

const androidBuildGradlePath = path.join(repoRoot, 'android/app/build.gradle');
if (existsSync(androidBuildGradlePath)) {
  const androidBuildGradle = readFileSync(androidBuildGradlePath, 'utf-8');

  if (!/minifyEnabled\s+true/i.test(androidBuildGradle)) {
    findings.push({
      file: 'android/app/build.gradle',
      line: 1,
      label: 'Android release minification must stay enabled',
      text: 'Set minifyEnabled true in the release build type before store submission.',
    });
  }

  if (!/shrinkResources\s+true/i.test(androidBuildGradle)) {
    findings.push({
      file: 'android/app/build.gradle',
      line: 1,
      label: 'Android release resource shrinking must stay enabled',
      text: 'Set shrinkResources true in the release build type before store submission.',
    });
  }
}

if (findings.length === 0) {
  console.log('Release readiness: no known blockers found.');
  process.exit(0);
}

console.log('Release readiness: manual blockers still need attention before store submission.\n');

for (const finding of findings) {
  console.log(`- ${finding.label}: ${finding.file}:${finding.line}`);
  console.log(`  ${finding.text}`);
}

console.log(
  strict
    ? '\nStrict mode failed because release blockers are still present.'
    : '\nNon-strict mode reports blockers only. Run npm run check:release:strict before an actual store submission.',
);

if (strict) {
  process.exit(1);
}
