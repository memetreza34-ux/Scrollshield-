import { readFile } from 'node:fs/promises';

const javaRoot = 'android/app/src/main/java/app/scrollshield/mobile';
const javaTestRoot = 'android/app/src/test/java/app/scrollshield/mobile';
const androidTestRoot = 'android/app/src/androidTest/java/app/scrollshield/mobile';

const paths = {
  packageJson: 'package.json',
  readiness: 'scripts/readiness-report.ts',
  plugin: `${javaRoot}/ScrollShieldNativePlugin.java`,
  store: `${javaRoot}/ProtectionConfigDurabilityStore.java`,
  storeTest: `${javaTestRoot}/ProtectionConfigDurabilityStoreTest.java`,
  certaintyPolicy: `${javaRoot}/ProtectionConfigWriteCertaintyPolicy.java`,
  certaintyPolicyTest: `${javaTestRoot}/ProtectionConfigWriteCertaintyPolicyTest.java`,
  runtimePolicy: `${javaRoot}/ProtectionConfigRuntimePolicy.java`,
  runtimePolicyTest: `${javaTestRoot}/ProtectionConfigRuntimePolicyTest.java`,
  service: `${javaRoot}/ScrollShieldProtectionService.java`,
  boot: `${javaRoot}/ScrollShieldBootReceiver.java`,
  bridge: 'src/lib/nativeProtection.ts',
  bridgeTest: 'src/lib/nativeProtection.test.ts',
  diagnostics: `${javaRoot}/ScrollShieldDiagnosticsPlugin.java`,
  diagnosticsBridge: 'src/lib/nativeDiagnostics.ts',
  debug: 'src/screens/DebugScreen.tsx',
  debugTest: 'src/screens/DebugScreen.test.tsx',
  instrumentation: `${androidTestRoot}/ProtectionConfigDurabilityInstrumentedTest.java`,
  matrix: 'docs/ANDROID_DEVICE_TEST_MATRIX.md',
  spec: 'docs/PROTECTION_CONFIG_DURABILITY.md',
} as const;

const entries = await Promise.all(
  Object.entries(paths).map(async ([key, file]) => [key, await readFile(file, 'utf8')] as const),
);
const source = Object.fromEntries(entries) as Record<keyof typeof paths, string>;
const findings: string[] = [];

function requirePattern(key: keyof typeof paths, pattern: RegExp, message: string) {
  if (!pattern.test(source[key])) findings.push(`${paths[key]}: ${message}`);
}

function forbidText(key: keyof typeof paths, text: string, message: string) {
  if (source[key].includes(text)) findings.push(`${paths[key]}: ${message}`);
}

requirePattern(
  'store',
  /CONFIG_GENERATION_KEY\s*=\s*"protection_config_generation"[\s\S]*START_REQUEST_CONFIG_GENERATION_KEY\s*=\s*"protection_start_request_config_generation"/,
  'Config store must retain separate durable current/request generation keys.',
);
requirePattern(
  'store',
  /commitConfig[\s\S]*validateConfig\(configJson\)[\s\S]*PreferenceSnapshot previous[\s\S]*UUID\.randomUUID\(\)\.toString\(\)[\s\S]*putString\(ScrollShieldNativePlugin\.CONFIG_KEY, configJson\)[\s\S]*putString\(UNAVAILABLE_APPS_KEY, unavailableJson\)[\s\S]*putString\(UNAVAILABLE_ACTIVE_APPS_KEY, unavailableActiveJson\)[\s\S]*putString\(CONFIG_GENERATION_KEY, generation\)[\s\S]*\.commit\(\)/,
  'Config JSON, availability metadata and generation must be one synchronous candidate commit with a pre-write snapshot.',
);
forbidText('store', '.apply()', 'Durability store must not use asynchronous SharedPreferences.apply().');
requirePattern(
  'store',
  /if \(persisted\)[\s\S]*writeStateCertain = ProtectionConfigWriteCertaintyPolicy\.isCertainAfterWrite\(true, false\)[\s\S]*restoreSnapshot\(preferences, previous\)[\s\S]*writeStateCertain = ProtectionConfigWriteCertaintyPolicy\.isCertainAfterWrite\([\s\S]*false,[\s\S]*rollbackPersisted/,
  'Candidate/rollback outcomes must update the process-local write-certainty state.',
);
requirePattern(
  'certaintyPolicy',
  /isCertainAfterWrite\(boolean candidatePersisted, boolean rollbackPersisted\)[\s\S]*candidatePersisted \|\| rollbackPersisted/,
  'Write-certainty policy must remain true only when candidate or rollback persistence is confirmed.',
);
requirePattern(
  'certaintyPolicyTest',
  /successfulCandidateCommitIsCertain[\s\S]*failedCandidateWithSuccessfulRollbackIsCertain[\s\S]*failedCandidateAndRollbackIsUncertain/,
  'Pure-Java tests must cover all config write-certainty outcomes.',
);
requirePattern(
  'runtimePolicy',
  /canUsePublishedRuntimeState\([\s\S]*isCurrentGeneration\(evidenceGeneration, publishedGeneration\)[\s\S]*if \(!writeStateCertain\)[\s\S]*return true[\s\S]*isCurrentGeneration\(publishedGeneration, currentPersistedGeneration\)/,
  'Runtime config policy must keep only the last published generation usable while persistence is uncertain.',
);
requirePattern(
  'runtimePolicy',
  /shouldInvalidateRuntimeState\([\s\S]*previousGeneration\.equals\(nextGeneration\)/,
  'Runtime config policy must invalidate grants/overlay state when a new generation is published.',
);
requirePattern(
  'runtimePolicyTest',
  /certainWritesRequirePublishedGenerationToStillMatchPersistence[\s\S]*uncertainWritesKeepOnlyLastPublishedGenerationUsable[\s\S]*publishedGenerationChangeInvalidatesExistingRuntimeState/,
  'Pure-Java tests must cover certain, uncertain, and generation-change runtime behavior.',
);
requirePattern(
  'store',
  /PreferenceSnapshot[\s\S]*hadConfig[\s\S]*hadUnavailableApps[\s\S]*hadUnavailableActiveApps[\s\S]*hadGeneration/,
  'Rollback must preserve whether every previous config tuple key existed, not just its fallback value.',
);
requirePattern(
  'store',
  /restoreSnapshot[\s\S]*ScrollShieldNativePlugin\.CONFIG_KEY[\s\S]*UNAVAILABLE_APPS_KEY[\s\S]*UNAVAILABLE_ACTIVE_APPS_KEY[\s\S]*CONFIG_GENERATION_KEY[\s\S]*rollback\.commit\(\)/,
  'Rollback must restore config, availability metadata and generation together.',
);
requirePattern(
  'store',
  /ensureGenerationForExistingConfig\(Context context\)[\s\S]*if \(!writeStateCertain\) return ""[\s\S]*validateConfig\(configJson\)[\s\S]*hadGeneration[\s\S]*previousGeneration[\s\S]*putString\(CONFIG_GENERATION_KEY, generation\)\.commit\(\)[\s\S]*if \(persisted\)[\s\S]*restoreString\(rollback, CONFIG_GENERATION_KEY, hadGeneration, previousGeneration\)[\s\S]*rollback\.commit\(\)[\s\S]*isCertainAfterWrite/,
  'Legacy generation bootstrap must rollback its candidate key and update certainty when persistence fails.',
);
requirePattern(
  'store',
  /matchesCurrentGeneration[\s\S]*if \(!writeStateCertain\) return false[\s\S]*isCurrentRequestGeneration[\s\S]*if \(!writeStateCertain\) return false/,
  'Normal start and pending/confirmation generation checks must fail closed while write state is uncertain.',
);
requirePattern(
  'storeTest',
  /generationNormalizationAcceptsOnlyCanonicalUuidValues[\s\S]*generationEqualityIsExactAfterNormalization/,
  'Pure-Java tests must lock UUID normalization/equality semantics.',
);

requirePattern(
  'plugin',
  /syncProtectionConfig\(PluginCall call\)[\s\S]*ProtectionConfigDurabilityStore\.commitConfig[\s\S]*if \(!commitResult\.persisted\)[\s\S]*if \(!commitResult\.rollbackPersisted\)[\s\S]*persistence is uncertain[\s\S]*call\.reject/,
  'Native sync must distinguish a normal candidate failure from an unconfirmed rollback.',
);
requirePattern(
  'plugin',
  /startProtectionService\(PluginCall call\)[\s\S]*matchesCurrentGeneration\(context, expectedConfigGeneration\)[\s\S]*isWriteStateCertain\(\)[\s\S]*START_FAILED/,
  'App start must fail closed when the config generation is stale/missing or persistence certainty is unresolved.',
);
requirePattern(
  'plugin',
  /recordProtectionStartRequested\(Context context, String expectedConfigGeneration\)[\s\S]*if \(!ProtectionConfigDurabilityStore\.isWriteStateCertain\(\)\) return false[\s\S]*expected\.equals\(current\)/,
  'No activation request may be recorded while config write certainty is unresolved.',
);
requirePattern(
  'plugin',
  /getProtectionServiceStatus[\s\S]*configWriteStateCertain[\s\S]*ProtectionConfigDurabilityStore\.isWriteStateCertain\(\)/,
  'Native status must expose config write certainty for diagnostics and support.',
);

requirePattern(
  'service',
  /refreshConfiguration\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*if \(!ProtectionConfigDurabilityStore\.isWriteStateCertain\(\)\) return;[\s\S]*CONFIG_GENERATION_KEY[\s\S]*nextRulesByPackage = new HashMap/,
  'The running service must refuse to republish preference state while config persistence is uncertain.',
);
requirePattern(
  'service',
  /refreshConfiguration\(\)[\s\S]*latestConfigJson[\s\S]*latestConfigGeneration[\s\S]*!configJson\.equals\(latestConfigJson\) \|\| !configGeneration\.equals\(latestConfigGeneration\)[\s\S]*shouldInvalidateRuntimeState[\s\S]*cachedConfigGeneration = configGeneration[\s\S]*publishedConfigGeneration = configGeneration[\s\S]*temporaryAccessUntil\.clear\(\)[\s\S]*hideOverlay\(\)/,
  'Publishing a new durable generation must publish explicit runtime generation evidence and invalidate temporary access/old overlay.',
);
requirePattern(
  'service',
  /isCurrentRuntimeConfigGeneration\(String generation\)[\s\S]*canUsePublishedRuntimeState\([\s\S]*writeStateCertain[\s\S]*generation[\s\S]*cachedConfigGeneration[\s\S]*getCurrentGeneration/,
  'Runtime actions must be judged against the published generation and current persistence certainty.',
);
requirePattern(
  'service',
  /enforceCurrentApp\(\)[\s\S]*isCurrentRuntimeConfigGeneration\(cachedConfigGeneration\)[\s\S]*hideOverlay\(\)[\s\S]*return;/,
  'Rule/grant evaluation must not continue from a stale published generation after a confirmed config change.',
);
requirePattern(
  'service',
  /onStartCommand[\s\S]*ProtectionConfigDurabilityStore\.isWriteStateCertain\(\)[\s\S]*ScrollShieldNativePlugin\.hasConfiguredApps\(this\)/,
  'A running service must not trust preference-based target configuration while write certainty is unresolved.',
);
requirePattern(
  'service',
  /CONFIGURATION_HEALTH_INTERVAL_MS[\s\S]*if \(ProtectionConfigDurabilityStore\.isWriteStateCertain\(\)\)[\s\S]*hasConfiguredApps = ScrollShieldNativePlugin\.hasConfiguredApps\(this\)/,
  'Periodic target-app health must not inspect uncertain preference config.',
);
requirePattern(
  'service',
  /showOverlay\([\s\S]*actionConfigGeneration = cachedConfigGeneration[\s\S]*setOnClickListener[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*isCurrentRuntimeConfigGeneration\(actionConfigGeneration\)[\s\S]*temporaryAccessUntil\.put[\s\S]*appendProtectionEvent/,
  'Overlay grants/events must re-check the exact generation immediately before writing access or evidence.',
);
requirePattern(
  'service',
  /WindowManager\.LayoutParams[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*isCurrentRuntimeConfigGeneration\(actionConfigGeneration\)[\s\S]*windowManager\.addView[\s\S]*appendProtectionEvent/,
  'A stale overlay must not be published or emit a warning/block event after a config generation changes.',
);
requirePattern(
  'service',
  /getPublishedConfigGeneration\(\)[\s\S]*onDestroy\(\)[\s\S]*publishedConfigGeneration = ""/,
  'Published runtime generation evidence must clear when the service is destroyed.',
);

requirePattern(
  'boot',
  /hasFreshProtectionStartRequest\(context\)[\s\S]*hasFreshProtectionStartRequestForCurrentConfig\(context\)[\s\S]*recovery_start_failed[\s\S]*recordProtectionStartRequested\(context\)/,
  'Boot/app-update recovery must reject stale/uncertain pending state through the durable request path.',
);

requirePattern(
  'bridge',
  /CONFIG_GENERATION_PATTERN[\s\S]*normalizeConfigGeneration[\s\S]*syncCommittedConfig[\s\S]*configGeneration/,
  'TypeScript bridge must validate the native durable config UUID before use.',
);
requirePattern(
  'bridgeTest',
  /starts only with the exact durable config generation returned by native sync[\s\S]*fails closed before start when native sync does not confirm a valid config generation/,
  'Vitest must prove exact durable generation forwarding and fail-closed missing-generation behavior.',
);

requirePattern(
  'diagnostics',
  /protectionConfigGeneration[\s\S]*protectionConfigWriteStateCertain[\s\S]*protectionRuntimeConfigGeneration[\s\S]*startRequestConfigGeneration/,
  'Native diagnostics must expose persisted generation, write certainty, published runtime generation, and request-bound generation.',
);
requirePattern(
  'diagnosticsBridge',
  /protectionConfigGeneration:\s*string[\s\S]*protectionConfigWriteStateCertain:\s*boolean[\s\S]*protectionRuntimeConfigGeneration:\s*string[\s\S]*startRequestConfigGeneration:\s*string/,
  'TypeScript diagnostics must type persisted/runtime config evidence.',
);
requirePattern(
  'debug',
  /Config-Schreibzustand[\s\S]*protectionConfigWriteStateCertain \? 'SICHER' : 'UNSICHER'[\s\S]*Config-Generation[\s\S]*Runtime-Config[\s\S]*Startrequest-Config/,
  'Debug UI must make config write certainty and persisted/runtime/request generations visible.',
);
requirePattern(
  'debugTest',
  /protectionConfigWriteStateCertain: true[\s\S]*protectionRuntimeConfigGeneration[\s\S]*Config-Schreibzustand[\s\S]*Runtime-Config/,
  'Debug UI test must cover config write certainty and runtime generation evidence.',
);

for (const method of [
  'durableConfigGenerationBindsStartRequestAndConfirmation',
  'staleConfigGenerationCannotCreateStartRequest',
  'freshPendingRequestFromPreviousConfigIsNotCurrent',
  'configChangeBeforeConfirmationFailsClosedWithoutConfirmingOldRequest',
  'legacyDurableConfigReceivesGenerationBeforeBootStyleStartRequest',
]) {
  requirePattern('instrumentation', new RegExp(`void\\s+${method}\\s*\\(`), `Android instrumentation is missing ${method}.`);
}

for (const id of ['APP-07', 'APP-08', 'APP-09', 'APP-10']) {
  requirePattern('matrix', new RegExp(`\\| ${id} \\|`), `Device matrix is missing ${id}.`);
}
requirePattern(
  'matrix',
  /protectionRuntimeConfigGeneration[\s\S]*APP-10/,
  'Device evidence must capture the actual published runtime generation for APP-09/APP-10.',
);
requirePattern(
  'spec',
  /commit\(\)[\s\S]*rollback[\s\S]*writeStateCertain[\s\S]*UNSICHER[\s\S]*temporary[\s\S]*overlay[\s\S]*APP-07[\s\S]*APP-08[\s\S]*APP-09[\s\S]*APP-10/i,
  'Durability spec must document rollback uncertainty, runtime invalidation, and all real device evidence.',
);

requirePattern('packageJson', /"check:config-durability":\s*"tsx scripts\/check-protection-config-durability\.ts"/, 'package.json must expose check:config-durability.');
requirePattern('packageJson', /"verify":[^\n]*npm run check:config-durability/, 'check:config-durability must be part of verify.');
requirePattern('readiness', /args: \['run', 'check:config-durability'\], required: true/, 'readiness must require check:config-durability.');

if (findings.length > 0) {
  console.log('Protection config durability check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection config durability check passed. Candidate/rollback certainty is explicit; uncertain writes preserve only the last published runtime generation, while confirmed generation changes invalidate stale grants and overlay actions before they can write access or events.',
);
