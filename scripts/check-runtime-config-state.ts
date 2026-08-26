import { readFile } from 'node:fs/promises';

const javaRoot = 'android/app/src/main/java/app/scrollshield/mobile';
const javaTestRoot = 'android/app/src/test/java/app/scrollshield/mobile';

const paths = {
  packageJson: 'package.json',
  readiness: 'scripts/readiness-report.ts',
  plugin: `${javaRoot}/ScrollShieldNativePlugin.java`,
  service: `${javaRoot}/ScrollShieldProtectionService.java`,
  policy: `${javaRoot}/ProtectionConfigRuntimePolicy.java`,
  policyTest: `${javaTestRoot}/ProtectionConfigRuntimePolicyTest.java`,
  spec: 'docs/PROTECTION_RUNTIME_CONFIG_STATE.md',
} as const;

const entries = await Promise.all(
  Object.entries(paths).map(async ([key, file]) => [key, await readFile(file, 'utf8')] as const),
);
const source = Object.fromEntries(entries) as Record<keyof typeof paths, string>;
const findings: string[] = [];

function requirePattern(key: keyof typeof paths, pattern: RegExp, message: string) {
  if (!pattern.test(source[key])) findings.push(`${paths[key]}: ${message}`);
}

function forbidPattern(key: keyof typeof paths, pattern: RegExp, message: string) {
  if (pattern.test(source[key])) findings.push(`${paths[key]}: ${message}`);
}

requirePattern(
  'policy',
  /canUsePublishedRuntimeState[\s\S]*writeStateCertain[\s\S]*publishedGeneration[\s\S]*currentPersistedGeneration/,
  'Runtime policy must explicitly distinguish published and persisted config generations.',
);
requirePattern(
  'policy',
  /if \(!writeStateCertain\)[\s\S]*return true[\s\S]*isCurrentGeneration\(publishedGeneration, currentPersistedGeneration\)/,
  'Uncertain writes may retain only the last published generation; certain writes must match persistence.',
);
requirePattern(
  'policy',
  /shouldInvalidateRuntimeState[\s\S]*previousGeneration[\s\S]*nextGeneration[\s\S]*!previousGeneration\.equals\(nextGeneration\)/,
  'A real published generation change must invalidate generation-scoped runtime state.',
);

requirePattern(
  'policyTest',
  /runtimeEvidenceIsCurrentOnlyForExactNonEmptyGeneration[\s\S]*certainWritesRequirePublishedGenerationToStillMatchPersistence[\s\S]*uncertainWritesKeepOnlyLastPublishedGenerationUsable[\s\S]*publishedGenerationChangeInvalidatesExistingRuntimeState/,
  'Pure-Java tests must cover exact generation, certainty, and invalidation semantics.',
);

requirePattern(
  'service',
  /publishedConfigGeneration\s*=\s*""[\s\S]*cachedConfigGeneration\s*=\s*""/,
  'Service must track both published and instance-cached config generation.',
);
requirePattern(
  'service',
  /if \(!isCurrentRuntimeConfigGeneration\(cachedConfigGeneration\)\)[\s\S]*hideOverlay\(\)[\s\S]*return;/,
  'Enforcement must stop using runtime state when its config generation is no longer current.',
);
requirePattern(
  'service',
  /shouldInvalidateRuntimeState\([\s\S]*cachedConfigGeneration,[\s\S]*configGeneration[\s\S]*if \(invalidateRuntimeState\)[\s\S]*generationBoundaryAt = System\.currentTimeMillis\(\)[\s\S]*recordAllowedUsage\(null, generationBoundaryAt\)[\s\S]*cachedConfigJson = configJson[\s\S]*cachedConfigGeneration = configGeneration[\s\S]*rulesByPackage\.clear\(\)[\s\S]*if \(invalidateRuntimeState\)[\s\S]*temporaryAccessUntil\.clear\(\)[\s\S]*hideOverlay\(\)/,
  'A generation switch must close the old usage tick before replacing rules, revoking temporary access, or removing the old overlay.',
);
requirePattern(
  'service',
  /recordAllowedUsage\(@Nullable String foregroundPackage, long now\)[\s\S]*ProtectionRule previousRule = rulesByPackage\.get\(lastUsagePackage\)[\s\S]*temporaryAccessUntil\.get\(lastUsagePackage\)[\s\S]*addPendingUsage\(previousRule\.id, lastUsageTickMs, boundedEnd\)[\s\S]*lastUsagePackage = foregroundPackage[\s\S]*lastUsageTickMs = now/,
  'Usage closure must attribute the pre-boundary interval through the still-published rule id before resetting the tick owner.',
);
requirePattern(
  'service',
  /final String actionConfigGeneration = cachedConfigGeneration[\s\S]*isCurrentRuntimeConfigGeneration\(actionConfigGeneration\)[\s\S]*continueButton\.setOnClickListener[\s\S]*!isCurrentRuntimeConfigGeneration\(actionConfigGeneration\)[\s\S]*!packageName\.equals\(overlayPackage\)/,
  'Overlay actions must bind to their config generation and revalidate it at click time.',
);
requirePattern(
  'service',
  /isCurrentRuntimeConfigGeneration\(String generation\)[\s\S]*ProtectionConfigDurabilityStore\.isWriteStateCertain\(\)[\s\S]*ProtectionConfigRuntimePolicy\.canUsePublishedRuntimeState/,
  'Runtime generation validation must include config write certainty.',
);
requirePattern(
  'service',
  /onDestroy\(\)[\s\S]*publishedConfigOwnerStartRequestAt == serviceStartRequestAtOnCreate[\s\S]*publishedConfigGeneration = ""/,
  'Destroy must clear process-visible runtime generation evidence only when the dying service owns it.',
);

requirePattern(
  'service',
  /private boolean recordIntentionalOpen\(String appId, long now\)[\s\S]*OPEN_KEY_PREFIX[\s\S]*return preferences\.edit\(\)\.putString\(key, result\.toString\(\)\)\.commit\(\)/,
  'Intentional-open history must be synchronously persisted and report commit success.',
);
requirePattern(
  'service',
  /private boolean incrementEmergencyCount\(String appId, long now\)[\s\S]*EMERGENCY_KEY_PREFIX[\s\S]*return preferences\.edit\(\)\.putInt\(key, preferences\.getInt\(key, 0\) \+ 1\)\.commit\(\)/,
  'Emergency daily count must be synchronously persisted and report commit success.',
);
forbidPattern(
  'service',
  /recordIntentionalOpen[\s\S]{0,1200}\.apply\(\)|incrementEmergencyCount[\s\S]{0,500}\.apply\(\)/,
  'Runtime authorization counters must not fall back to asynchronous apply().',
);
requirePattern(
  'plugin',
  /public static boolean appendProtectionEvent\([\s\S]*return editor\.commit\(\)[\s\S]*catch \(JSONException error\)[\s\S]*return false/,
  'Protection event persistence must expose its synchronous commit result for authorization paths.',
);
requirePattern(
  'service',
  /if \(!incrementEmergencyCount\(rule\.id, actionTime\)\) return;[\s\S]*if \(!ScrollShieldNativePlugin\.appendProtectionEvent\([\s\S]*"emergency"[\s\S]*\)\) return;[\s\S]*temporaryAccessUntil\.put/,
  'Emergency access must be granted only after both the daily counter and local event are durably persisted.',
);
requirePattern(
  'service',
  /if \(!recordIntentionalOpen\(rule\.id, actionTime\)\) return;[\s\S]*if \(!ScrollShieldNativePlugin\.appendProtectionEvent\([\s\S]*"open"[\s\S]*\)\) return;[\s\S]*temporaryAccessUntil\.put/,
  'Intentional access must be granted only after both open history and local event are durably persisted.',
);

for (const id of ['RUNTIME-01', 'RUNTIME-02', 'RUNTIME-03', 'RUNTIME-04', 'RUNTIME-05', 'RUNTIME-06']) {
  requirePattern('spec', new RegExp(id), `Runtime config spec is missing ${id}.`);
}
requirePattern(
  'spec',
  /temporaryAccessUntil[\s\S]*actionConfigGeneration[\s\S]*UNSICHER[\s\S]*Usage-Grenze[\s\S]*recordAllowedUsage\(null, generationBoundaryAt\)[\s\S]*RUNTIME-05[\s\S]*RUNTIME-06/i,
  'Runtime config spec must document generation state, usage boundary, and durable authorization actions.',
);

requirePattern(
  'packageJson',
  /"check:runtime-config-state":\s*"tsx scripts\/check-runtime-config-state\.ts"/,
  'package.json must expose check:runtime-config-state.',
);
requirePattern(
  'packageJson',
  /"verify":[^\n]*npm run check:runtime-config-state/,
  'check:runtime-config-state must be part of verify.',
);
requirePattern(
  'readiness',
  /args: \['run', 'check:runtime-config-state'\], required: true/,
  'readiness must require check:runtime-config-state.',
);

if (findings.length > 0) {
  console.log('Runtime config state check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Runtime config state check passed. Config-generation state, G1→G2 usage boundaries, durable intentional/emergency action evidence, and fail-closed temporary grants remain guarded.',
);
