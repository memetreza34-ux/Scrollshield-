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
    pattern: /Angaben vor Release|Vor Release ergänzen|Musterstra|Max Mustermann/i,
    files: ['src/screens/SupportScreen.tsx', 'public/privacy.html'],
  },
  {
    label: 'Unfinished release UI',
    pattern: /Lorem Ipsum|Coming Soon|Demnächst|TODO|FIXME|Beispieltext|Testdaten/i,
    files: releaseScreenFiles,
  },
  {
    label: 'Unverified support domain',
    pattern: /support@scrollshield\.app/i,
    files: [
      'src/lib/contact.ts',
      'src/screens/SupportScreen.tsx',
      'public/privacy.html',
      'docs/RELEASE_CHECKLIST.md',
      'docs/ROLLOUT_PLAN.md',
    ],
  },
  {
    label: 'Risky store claim',
    pattern:
      /100%\s*(?:unumgehbar|offline)|unumgehbar|unüberwind|kompromisslos|komplett\s+blockier|blockiert\s+alles|garantiert\s+block|sofort\s+(?:und\s+)?(?:strikt\s+)?block|ohne\s+Ausnahme\s+block|nichts\s+wird\s+je|social media addiction/i,
    files: [...releaseScreenFiles, 'src/types.tsx', 'docs/STORE_LISTING_COPY.md', 'metadata.json', 'README.md'],
  },
  // Production V1 intentionally ships without AccessibilityService. Research
  // source may remain in the repository, but it must not become a release dependency.
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
    text: 'Create a static privacy policy page before public web launch or later store review.',
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
    { label: 'adaptive reopen positioning', pattern: /Wiederöffnungs-Schutz|wieder zurückkehr/i },
    { label: 'focus keyword', pattern: /\bFokus\b/i },
    { label: 'screen-time keyword', pattern: /\bBildschirmzeit\b/i },
    { label: 'digital-wellbeing keyword', pattern: /\bDigital Wellbeing\b/i },
    { label: 'short-video V1 boundary', pattern: /kein Bestandteil der V1-Produktzusage/i },
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

  // V1 must not register an AccessibilityService. If this appears in the
  // production manifest, scope has drifted into post-V1 research.
  if (/BIND_ACCESSIBILITY_SERVICE/i.test(androidManifest)) {
    findings.push({
      file: 'android/app/src/main/AndroidManifest.xml',
      line: 1,
      label: 'Post-V1 Accessibility service leaked into V1',
      text: 'Production V1 must not register an AccessibilityService or advertise feed-level blocking.',
    });
    const accessibilityConfigPath = path.join(
      repoRoot,
      'android/app/src/main/res/xml/accessibility_service_config.xml',
    );
    const accessibilityConfig = existsSync(accessibilityConfigPath)
      ? readFileSync(accessibilityConfigPath, 'utf-8')
      : '';

    if (/canPerformGestures="true"/i.test(accessibilityConfig)) {
      findings.push({
        file: 'android/app/src/main/res/xml/accessibility_service_config.xml',
        line: 1,
        label: 'Accessibility service must not request gesture control',
        text: 'canPerformGestures makes the service a Play policy violation; ScrollShield only needs GLOBAL_ACTION_BACK.',
      });
    }

    // The privacy promise in the store declaration is that no text is read.
    // Verify it against the sources instead of trusting the documentation.
    const accessibilitySources = ['android/app/src/main/java/app/scrollshield/mobile/ShortVideoWatchService.kt'];
    for (const relativePath of accessibilitySources) {
      const sourcePath = path.join(repoRoot, relativePath);
      if (!existsSync(sourcePath)) continue;
      const source = readFileSync(sourcePath, 'utf-8');
      if (/\.(?:getText|getContentDescription)\(\)|\btext\s*=\s*node\./.test(source)) {
        findings.push({
          file: relativePath,
          line: 1,
          label: 'Accessibility service must not read screen text',
          text: 'getText()/getContentDescription() contradict the store declaration and the in-app disclosure.',
        });
      }
    }

    const storePacketPath = path.join(repoRoot, 'docs/STORE_SUBMISSION_PACKET.md');
    const storePacket = existsSync(storePacketPath) ? readFileSync(storePacketPath, 'utf-8') : '';

    if (!/Accessibility API Declaration/i.test(storePacket)) {
      findings.push({
        file: 'docs/STORE_SUBMISSION_PACKET.md',
        line: 1,
        label: 'Accessibility declaration missing',
        text: 'Play requires a declaration plus prominent disclosure before the accessibility service may ship.',
      });
    }

    // The accessibility service was shipped once without the privacy policy
    // mentioning it at all. Keep the document in sync with the manifest.
    const privacyPolicy = existsSync(privacyPolicyPath) ? readFileSync(privacyPolicyPath, 'utf-8') : '';
    if (!/Bedienungshilfe/i.test(privacyPolicy)) {
      findings.push({
        file: 'public/privacy.html',
        line: 1,
        label: 'Privacy policy does not cover the accessibility service',
        text: 'The manifest ships an accessibility service; the policy must describe what it reads and what it does not.',
      });
    }

    // Google requires the disclosure in the app itself, before the user is sent
    // to the system settings — not only in the store listing.
    const permissionsScreenPath = path.join(repoRoot, 'src/screens/PermissionsScreen.tsx');
    const permissionsScreen = existsSync(permissionsScreenPath) ? readFileSync(permissionsScreenPath, 'utf-8') : '';

    const disclosureSignals = [
      { label: 'what is read', pattern: /Was der Dienst liest/i },
      { label: 'what is not read', pattern: /NICHT liest/i },
      { label: 'where the data goes', pattern: /Wohin die Daten gehen/i },
    ];

    for (const signal of disclosureSignals) {
      if (signal.pattern.test(permissionsScreen)) continue;
      findings.push({
        file: 'src/screens/PermissionsScreen.tsx',
        line: 1,
        label: 'Prominent disclosure incomplete',
        text: `The accessibility disclosure must state: ${signal.label}.`,
      });
    }
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

console.log('Release readiness: manual blockers still need attention before public launch or store submission.\n');

for (const finding of findings) {
  console.log(`- ${finding.label}: ${finding.file}:${finding.line}`);
  console.log(`  ${finding.text}`);
}

console.log(
  strict
    ? '\nStrict mode failed because release blockers are still present.'
    : '\nNon-strict mode reports blockers only. Run npm run check:release:strict before an actual public launch.',
);

if (strict) {
  process.exit(1);
}
