import { readFile } from 'node:fs/promises';

const bridgePath = 'src/lib/nativeProtection.ts';
const bridgeTestPath = 'src/lib/nativeProtection.test.ts';
const healthPath = 'src/lib/nativeProtectionHealth.ts';
const healthTestPath = 'src/lib/nativeProtectionHealth.test.ts';

const [bridge, bridgeTest, health, healthTest] = await Promise.all([
  readFile(bridgePath, 'utf8'),
  readFile(bridgeTestPath, 'utf8'),
  readFile(healthPath, 'utf8'),
  readFile(healthTestPath, 'utf8'),
]);

const findings: string[] = [];

const requirePattern = (file: string, content: string, pattern: RegExp, message: string) => {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
};

requirePattern(
  bridgePath,
  bridge,
  /NativeProtectionHealth[\s\S]*'unclean-process-stop'/,
  'Native lifecycle health must expose a dedicated unclean-process-stop state.',
);
requirePattern(
  bridgePath,
  bridge,
  /!status\.running && status\.enabled[\s\S]*status\.lastStartAt > 0[\s\S]*status\.lastStartAt > status\.lastStopAt[\s\S]*return 'unclean-process-stop'/,
  'A saved activation with no running service and a newer start than stop record must classify as an unclean process stop.',
);
requirePattern(
  bridgePath,
  bridge,
  /return 'unclean-process-stop'[\s\S]*return 'stale-activation'/,
  'Generic stale activation must remain the fallback only after the unclean-process-stop boundary is checked.',
);
requirePattern(
  healthPath,
  health,
  /case 'unclean-process-stop':[\s\S]*PROZESS ABGEBROCHEN[\s\S]*System-Kill[\s\S]*showLastStop: false/,
  'The user-facing health presentation must explain an unclean process stop without presenting an older stop record as current evidence.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /detects an unclean process stop when the last start has no later stop record[\s\S]*health: 'unclean-process-stop'/,
  'Vitest must cover process-loss detection from persisted lifecycle timestamps.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /lastStartAt: 200[\s\S]*lastStopAt: 100[\s\S]*unclean-process-stop/,
  'The deterministic lifecycle-state test must lock the lastStartAt > lastStopAt boundary.',
);
requirePattern(
  healthTestPath,
  healthTest,
  /explains an unclean process stop without trusting an older stop record[\s\S]*PROZESS ABGEBROCHEN[\s\S]*showLastStop\)\.toBe\(false\)/,
  'Presentation tests must prove older stop evidence is hidden for an unclean process stop.',
);

if (findings.length > 0) {
  console.log('Process-loss recovery contract check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Process-loss recovery contract check passed. Missing-service state with a newer persisted start is distinguished from ordinary stale activation.',
);
