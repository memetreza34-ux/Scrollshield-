import { readFile } from 'node:fs/promises';

const helperPath = 'src/lib/protectionInsights.ts';
const helperTestPath = 'src/lib/protectionInsights.test.ts';
const panelPath = 'src/components/ProtectionInsightsPanel.tsx';
const panelTestPath = 'src/components/ProtectionInsightsPanel.test.tsx';
const historyPath = 'src/screens/HistoryScreen.tsx';
const subscriptionGatePath = 'docs/SUBSCRIPTION_RELEASE_GATE.md';

const [helper, helperTest, panel, panelTest, history, subscriptionGate] = await Promise.all([
  readFile(helperPath, 'utf8'),
  readFile(helperTestPath, 'utf8'),
  readFile(panelPath, 'utf8'),
  readFile(panelTestPath, 'utf8'),
  readFile(historyPath, 'utf8'),
  readFile(subscriptionGatePath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
}

function rejectPattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) findings.push(`${file}: ${message}`);
}

requirePattern(
  helperPath,
  helper,
  /getLocalDateKeys[\s\S]*buildProtectionInsightPeriod[\s\S]*compareProtectionInsightPeriods/,
  'Insights must use explicit local calendar periods and equal-length comparisons.',
);
requirePattern(
  helperPath,
  helper,
  /Number\.isFinite\(rawMinutes\)[\s\S]*Math\.max\(0, rawMinutes\)[\s\S]*if \(minutes > 0\) appUsage/,
  'Measured usage must reject corrupted values and must not invent a zero-minute top app.',
);
requirePattern(
  helperPath,
  helper,
  /estimatedSavedMinutes[\s\S]*measuredUsageMinutes/,
  'Measured usage and estimated saved time must remain separate fields.',
);
requirePattern(
  helperTestPath,
  helperTest,
  /aggregates only measured local usage and separately retains estimated saved time[\s\S]*ignores negative and non-finite corrupted counters[\s\S]*trend against the immediately preceding period/,
  'Insight tests must cover measurement separation, corrupted counters, and previous-period comparison.',
);
requirePattern(
  panelPath,
  panel,
  /\(\[7, 30\] as const\)[\s\S]*compareProtectionInsightPeriods/,
  'Insights panel must expose both 7-day and 30-day local comparisons.',
);
requirePattern(
  panelPath,
  panel,
  /Gemessene Nutzung[\s\S]*Interventionen[\s\S]*Notfallfreigaben[\s\S]*Fokuszeit/,
  'Insights panel must show the supported measured protection metrics.',
);
requirePattern(
  panelPath,
  panel,
  /„Geschätzt gespart“ bleibt eine separate Produktschätzung und wird hier nicht als Messwert ausgegeben/,
  'Insights must explicitly distinguish the saved-time estimate from measured data.',
);
rejectPattern(
  panelPath,
  panel,
  /KI-Analyse|AI insight|diagnostiziert|Sucht erkannt|Abhängigkeit erkannt/i,
  'Insights must not make unsupported AI or health/addiction claims.',
);
requirePattern(
  panelTestPath,
  panelTest,
  /measured local insights without presenting estimated saved time as measurement[\s\S]*equal-length 7 and 30 day comparisons/,
  'Panel tests must protect measurement truthfulness and both time ranges.',
);
requirePattern(
  historyPath,
  history,
  /ProtectionInsightsPanel[\s\S]*<ProtectionInsightsPanel state=\{state\}/,
  'The measured insights panel must be part of the production history/statistics screen.',
);
requirePattern(
  subscriptionGatePath,
  subscriptionGate,
  /richer 7\/30-day local insights and behavior trends based only on measured data/,
  'Subscription planning must describe advanced insights as measured local data only.',
);

if (findings.length > 0) {
  console.log('Protection insights check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection insights check passed. Seven- and thirty-day comparisons remain local, measured usage is separated from saved-time estimates, corrupted counters are bounded, and the panel is visible in production statistics.',
);
