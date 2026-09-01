import { readFile } from 'node:fs/promises';

const configPath = 'src/lib/protectionConfig.ts';
const configTestPath = 'src/lib/protectionConfig.test.ts';
const statePath = 'src/lib/state.ts';
const stateTestPath = 'src/lib/state.test.ts';
const nativePath = 'src/lib/nativeProtection.ts';
const nativeTestPath = 'src/lib/nativeProtection.test.ts';
const appDetailPath = 'src/screens/AppDetailScreen.tsx';
const appDetailTestPath = 'src/screens/AppDetailScreen.test.tsx';
const adaptivePolicyPath = 'android/app/src/main/java/app/scrollshield/mobile/AdaptiveFrictionPolicy.java';
const adaptivePolicyTestPath = 'android/app/src/test/java/app/scrollshield/mobile/AdaptiveFrictionPolicyTest.java';
const servicePath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldProtectionService.java';
const adaptiveContractPath = 'docs/ADAPTIVE_FRICTION.md';
const matrixPath = 'docs/ANDROID_DEVICE_TEST_MATRIX.md';

const [
  config,
  configTest,
  state,
  stateTest,
  native,
  nativeTest,
  appDetail,
  appDetailTest,
  adaptivePolicy,
  adaptivePolicyTest,
  service,
  adaptiveContract,
  matrix,
] = await Promise.all([
  readFile(configPath, 'utf8'),
  readFile(configTestPath, 'utf8'),
  readFile(statePath, 'utf8'),
  readFile(stateTestPath, 'utf8'),
  readFile(nativePath, 'utf8'),
  readFile(nativeTestPath, 'utf8'),
  readFile(appDetailPath, 'utf8'),
  readFile(appDetailTestPath, 'utf8'),
  readFile(adaptivePolicyPath, 'utf8'),
  readFile(adaptivePolicyTestPath, 'utf8'),
  readFile(servicePath, 'utf8'),
  readFile(adaptiveContractPath, 'utf8'),
  readFile(matrixPath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

function rejectPattern(file: string, content: string, pattern: RegExp, message: string) {
  if (!pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

for (const bound of [
  'openDelaySeconds',
  'dailyLimitMinutes',
  'sessionMinutes',
  'antiBingeWarningThreshold',
  'antiBingeBlockThreshold',
  'antiBingeWindowMinutes',
  'emergencyDurationMinutes',
  'emergencyMaxPerDay',
]) {
  requirePattern(configPath, config, new RegExp(`\\b${bound}\\b`), `Missing protection bound ${bound}.`);
}
requirePattern(
  configPath,
  config,
  /sessionMinutes:\s*\{ min: 1, max: 240 \}/,
  'A consciously allowed app session must never normalize to zero minutes.',
);
requirePattern(
  configPath,
  config,
  /Math\.max\(rawBlockThreshold, warningThreshold \+ 1\)/,
  'Anti-Binge strict blocking must remain above the warning threshold.',
);
requirePattern(
  configPath,
  config,
  /config\.emergencyUnlock\.enabled \? 1 : PROTECTION_BOUNDS\.emergencyMaxPerDay\.min/,
  'An enabled emergency path must allow at least one configured release per day.',
);
requirePattern(
  configTestPath,
  configTest,
  /bounds extreme values before they reach the native protection engine[\s\S]*never creates a zero-minute session[\s\S]*strict Anti-Binge block happens after the warning threshold/,
  'Protection-config tests must cover bounds, session minimum, and Anti-Binge ordering.',
);

requirePattern(
  statePath,
  state,
  /normalizeProtectionConfig\(\{[\s\S]*DEFAULT_APP_CONFIG[\s\S]*emergencyUnlock[\s\S]*antiBinge/,
  'Restored/imported app configuration must pass through the same protection normalizer.',
);
requirePattern(
  stateTestPath,
  stateTest,
  /normalizes unsafe restored protection values before UI or native sync[\s\S]*sessionLimit\)\.toBe\(1\)[\s\S]*maxPerDay\)\.toBe\(1\)/,
  'State restore tests must guard unsafe values before UI/native sync.',
);

requirePattern(
  nativePath,
  native,
  /normalizeProtectionConfig\(rawConfig\)[\s\S]*delaySeconds: appConfig\.openDelay[\s\S]*sessionMinutes: appConfig\.sessionLimit/,
  'Native JSON serialization must use normalized app configuration.',
);
requirePattern(
  nativeTestPath,
  nativeTest,
  /syncs emergency countdown and reason requirements to Android/,
  'Native bridge tests must continue covering emergency friction serialization.',
);

requirePattern(
  appDetailPath,
  appDetail,
  /normalizeProtectionConfig[\s\S]*Tägliches Sperrfenster aktivieren[\s\S]*Sperrfenster Start[\s\S]*Sperrfenster Ende/,
  'App detail must normalize edits and expose the native daily block window.',
);
requirePattern(
  appDetailPath,
  appDetail,
  /Session-Länge[\s\S]*options=\{\[1, 2, 5, 10, 15, 30\]\}/,
  'Session length must expose a real minimum instead of a fake disabled state.',
);
const sessionStart = appDetail.indexOf('Session-Länge');
const openingDelayStart = appDetail.indexOf('Öffnungsverzögerung', sessionStart + 1);
if (sessionStart < 0 || openingDelayStart < 0) {
  findings.push(`${appDetailPath}: Could not isolate the session-length control for validation.`);
} else {
  const sessionSection = appDetail.slice(sessionStart, openingDelayStart);
  rejectPattern(
    appDetailPath,
    sessionSection,
    /allowDisabled/,
    'Session length must not claim to support a disabled state that Android turns into one minute.',
  );
}
requirePattern(
  appDetailTestPath,
  appDetailTest,
  /overnight-safe default[\s\S]*blockHours: '22:00-07:00'[\s\S]*normalizes invalid Anti-Binge ordering/,
  'App-detail tests must cover native block-window activation and Anti-Binge normalization.',
);

requirePattern(
  adaptivePolicyPath,
  adaptivePolicy,
  /ESCALATION_STEP_SECONDS = 5[\s\S]*MAX_ADAPTIVE_DELAY_SECONDS = 60/,
  'Adaptive friction must retain the fixed 5-second step and 60-second cap.',
);
requirePattern(
  adaptivePolicyPath,
  adaptivePolicy,
  /opens < warningThreshold[\s\S]*opens - warningThreshold \+ 1[\s\S]*Math\.max\(baseDelay, MAX_ADAPTIVE_DELAY_SECONDS\)[\s\S]*Math\.min\(increased, cap\)/,
  'Adaptive delay must start at the warning threshold, grow deterministically, stay capped, and never reduce a longer base delay.',
);
requirePattern(
  adaptivePolicyTestPath,
  adaptivePolicyTest,
  /disabledKeepsBaseDelay[\s\S]*belowWarningThresholdKeepsBaseDelay[\s\S]*warningThresholdStartsProgressiveDelay[\s\S]*progressiveDelayIsCappedAtSixtySeconds[\s\S]*policyNeverReducesAnExistingLongerBaseDelay/,
  'Adaptive-friction JUnit coverage must protect disabled, threshold, escalation, cap, and base-delay boundaries.',
);
requirePattern(
  servicePath,
  service,
  /countRecentOpens\(rule\.id, rule\.warningWindowMinutes, now\)[\s\S]*AdaptiveFrictionPolicy\.resolveDelaySeconds[\s\S]*effectiveNormalDelaySeconds/,
  'The Android service must derive adaptive friction from the existing local warning-window open counter.',
);
requirePattern(
  servicePath,
  service,
  /countdownSeconds = strict[\s\S]*EmergencyUnlockPolicy\.resolveCountdownSeconds[\s\S]*rule\.delaySeconds[\s\S]*: effectiveNormalDelaySeconds/,
  'Adaptive friction must affect only normal opening delay and must not rewrite strict emergency timing.',
);
requirePattern(
  servicePath,
  service,
  /recordIntentionalOpen\(rule\.id, actionTime\)[\s\S]*Adaptive Anti-Binge-Pause:/,
  'Only a successful normal intentional opening should feed the existing counter, and adaptive escalation must remain visible in local event evidence.',
);
requirePattern(
  servicePath,
  service,
  /countRecentOpens[\s\S]*getPreviousDayKey\(now\)[\s\S]*countRecentOpensForKey/,
  'Adaptive friction must retain the existing recent-open accounting across local midnight.',
);
requirePattern(
  appDetailPath,
  appDetail,
  /Adaptive Anti-Binge-Reibung[\s\S]*pro weiterer Öffnung um 5 Sekunden[\s\S]*auf 60 Sekunden begrenzt[\s\S]*Notfallfreigaben verwenden weiterhin ihren eigenen Countdown/,
  'The release UI must explain the adaptive formula, cap, and emergency separation.',
);
requirePattern(
  appDetailTestPath,
  appDetailTest,
  /explains deterministic adaptive Anti-Binge friction without changing emergency timing/,
  'React regression coverage must protect the adaptive-friction disclosure.',
);
requirePattern(
  adaptiveContractPath,
  adaptiveContract,
  /not machine learning and not an AI prediction system[\s\S]*Only a successful normal `Bewusst öffnen` action[\s\S]*5 seconds[\s\S]*60 seconds[\s\S]*must \*\*not\*\* lengthen or rewrite/,
  'Adaptive-friction documentation must remain deterministic, local, transparent, and separate from emergency behavior.',
);
rejectPattern(
  adaptiveContractPath,
  adaptiveContract,
  /(?:is|uses|powered by|driven by)\s+(?:an?\s+)?(?:AI|machine learning|addiction score|diagnosis)/i,
  'Adaptive friction must not positively market itself as AI, machine learning, diagnosis, or an addiction score.',
);
for (const scenario of ['ADAPT-01', 'ADAPT-02', 'ADAPT-03', 'ADAPT-04', 'ADAPT-05']) {
  requirePattern(
    matrixPath,
    matrix,
    new RegExp(`\\b${scenario}\\b`),
    `Physical adaptive-friction evidence is missing: ${scenario}.`,
  );
}

if (findings.length > 0) {
  console.log('Protection configuration check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection configuration check passed. Restores, UI edits and native serialization share bounded values; sessions cannot silently become one minute; Anti-Binge ordering, adaptive local friction, emergency separation and overnight block-window controls remain guarded.',
);
