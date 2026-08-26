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
  /ensureGenerationForExistingConfig\(Context context\)[\s\S]*if \(!writeStateCertain\) return ""[\s\S]*validateConfig\(configJson\)/,
  'Boot-style generation bootstrap must be blocked while persistence certainty is unresolved.',
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
  /cachedConfigGeneration\s*=\s*""[\s\S]*refreshConfiguration\(\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*CONFIG_GENERATION_KEY[\s\S]*nextRulesByPackage = new HashMap/,
  'The running service must snapshot config JSON and generation under the dispatch lock before parsing a candidate.',
);
requirePattern(
  'service',
  /refreshConfiguration\(\)[\s\S]*latestConfigJson[\s\S]*latestConfigGeneration[\s\S]*!configJson\.equals\(latestConfigJson\) \|\| !configGeneration\.equals\(latestConfigGeneration\)[\s\S]*return;[\s\S]*cachedConfigJson = configJson[\s\S]*cachedConfigGeneration = configGeneration[\s\S]*rulesByPackage\.putAll\(nextRulesByPackage\)/,
  'Parsed rules may publish only if both config JSON and generation are still current at the second locked boundary.',
);
requirePattern(
  'service',
  /CONFIGURATION_HEALTH_INTERVAL_MS[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*hasConfiguredApps = ScrollShieldNativePlugin\.hasConfiguredApps\(this\)/,
  'Target-app health must not inspect the config tuple concurrently with a candidate commit/rollback.',
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
  /protectionConfigGeneration[\s\S]*protectionConfigWriteStateCertain[\s\S]*startRequestConfigGeneration/,
  'Native diagnostics must expose config generation, write certainty, and request-bound generation.',
);
requirePattern(
  'diagnosticsBridge',
  /protectionConfigGeneration:\s*string[\s\S]*protectionConfigWriteStateCertain:\s*boolean[\s\S]*startRequestConfigGeneration:\s*string/,
  'TypeScript diagnostics must type config write certainty.',
);
requirePattern(
  'debug',
  /Config-Schreibzustand[\s\S]*protectionConfigWriteStateCertain \? 'SICHER' : 'UNSICHER'[\s\S]*Config-Generation[\s\S]*Startrequest-Config/,
  'Debug UI must make config write certainty and both generations visible.',
);
requirePattern(
  'debugTest',
  /protectionConfigWriteStateCertain: true[\s\S]*Config-Schreibzustand[\s\S]*SICHER/,
  'Debug UI test must cover config write certainty evidence.',
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

for (const id of ['APP-07', 'APP-08', 'APP-09']) {
  requirePattern('matrix', new RegExp(`\\| ${id} \\|`), `Device matrix is missing ${id}.`);
}
requirePattern(
  'spec',
  /commit\(\)[\s\S]*rollback[\s\S]*writeStateCertain[\s\S]*UNSICHER[\s\S]*APP-07[\s\S]*APP-08[\s\S]*APP-09/,
  'Durability spec must document rollback uncertainty, generation binding, and all real device evidence.',
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
  'Protection config durability check passed. Candidate/rollback certainty is explicit; uncertain writes block new starts until a clean sync succeeds, while running rules publish only from a still-current confirmed config generation.',
);
