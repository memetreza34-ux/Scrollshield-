import { readFile } from 'node:fs/promises';

const dashboardPath = 'src/screens/DashboardScreen.tsx';
const bannerPath = 'src/components/ProtectionRuntimeBanner.tsx';
const bannerTestPath = 'src/components/ProtectionRuntimeBanner.test.tsx';
const nativePath = 'src/lib/nativeProtection.ts';

const [dashboard, banner, bannerTest, native] = await Promise.all([
  readFile(dashboardPath, 'utf8'),
  readFile(bannerPath, 'utf8'),
  readFile(bannerTestPath, 'utf8'),
  readFile(nativePath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
}

function rejectPattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) findings.push(`${file}: ${message}`);
}

requirePattern(
  dashboardPath,
  dashboard,
  /ProtectionRuntimeBanner[\s\S]*<ProtectionRuntimeBanner state=\{state\} navigate=\{navigate\}/,
  'Production dashboard must show actual Android service/activation status.',
);
requirePattern(
  bannerPath,
  banner,
  /NativeProtection\.getStatus\(\)[\s\S]*setInterval[\s\S]*visibilitychange/,
  'Runtime banner must refresh native status while the dashboard remains mounted and after returning to the app.',
);
requirePattern(
  bannerPath,
  banner,
  /status\?\.running && status\.enabled[\s\S]*Android-Schutz läuft/,
  'The active label must require both a running service and stored activation.',
);
requirePattern(
  bannerPath,
  banner,
  /status\?\.enabled && !status\.running[\s\S]*Android-Schutz ist nicht laufend/,
  'Stale activation must be shown separately from a running service.',
);
requirePattern(
  bannerPath,
  banner,
  /Android-Schutz ist gestoppt[\s\S]*Regeln sind gespeichert, aber sie werden nicht durch den nativen Dienst durchgesetzt/,
  'Configured rules must never be presented as active enforcement after the native service is stopped.',
);
requirePattern(
  bannerPath,
  banner,
  /Letzter Stopp:[\s\S]*lastStopMessage/,
  'The dashboard status must surface the persisted native stop reason when available.',
);
rejectPattern(
  bannerPath,
  banner,
  /Schutz ist garantiert|ununterbrochen geschützt|kann nicht gestoppt werden/i,
  'Runtime status must not claim tamper-proof or guaranteed uninterrupted protection.',
);
requirePattern(
  bannerTestPath,
  bannerTest,
  /service and activation are both active[\s\S]*stopped warning even though app rules remain configured[\s\S]*stale stored activation[\s\S]*becomes visible again/,
  'Runtime banner tests must cover active, stopped, stale, and refresh behavior.',
);
requirePattern(
  nativePath,
  native,
  /running:\s*boolean[\s\S]*enabled:\s*boolean[\s\S]*lastStopMessage:\s*string[\s\S]*health:\s*NativeProtectionHealth/,
  'Native status contract must retain running, activation, stop reason, and health fields.',
);

if (findings.length > 0) {
  console.log('Protection runtime-status check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection runtime-status check passed. The production dashboard distinguishes configured rules from actual native enforcement and refreshes service health after app visibility changes.',
);
