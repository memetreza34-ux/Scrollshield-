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
  boot: `${javaRoot}/ScrollShieldBootReceiver.java`,
  bridge: 'src/lib/nativeProtection.ts',
  bridgeTest: 'src/lib/nativeProtection.test.ts',
  diagnostics: `${javaRoot}/ScrollShieldDiagnosticsPlugin.java`,
  diagnosticsBridge: 'src/lib/nativeDiagnostics.ts',
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
  /commitConfig[\s\S]*validateConfig\(configJson\)[\s\S]*UUID\.randomUUID\(\)\.toString\(\)[\s\S]*putString\(ScrollShieldNativePlugin\.CONFIG_KEY, configJson\)[\s\S]*putString\(UNAVAILABLE_APPS_KEY, unavailableJson\)[\s\S]*putString\(UNAVAILABLE_ACTIVE_APPS_KEY, unavailableActiveJson\)[\s\S]*putString\(CONFIG_GENERATION_KEY, generation\)[\s\S]*\.commit\(\)/,
  'Config JSON, availability metadata and generation must be one synchronous durable commit.',
);
forbidText('store', '.apply()', 'Durable protection config storage must never use SharedPreferences.apply().');
requirePattern(
  'store',
  /ensureGenerationForExistingConfig[\s\S]*validateConfig\(configJson\)[\s\S]*putString\(CONFIG_GENERATION_KEY, generation\)\.commit\(\)/,
  'Existing persisted config may receive a recovery generation only after validation and commit.',
);
requirePattern(
  'storeTest',
  /generationNormalizationAcceptsOnlyCanonicalUuidValues[\s\S]*generationEqualityIsExactAfterNormalization/,
  'Pure-Java tests must lock UUID normalization/equality semantics.',
);

requirePattern(
  'plugin',
  /syncProtectionConfig\(PluginCall call\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*ProtectionConfigDurabilityStore\.commitConfig[\s\S]*if \(!commitResult\.persisted\)[\s\S]*call\.reject[\s\S]*result\.put\("configGeneration", commitResult\.generation\)/,
  'Native sync must hold the dispatch lock, require commit success, and return the durable generation.',
);
const syncStart = source.plugin.indexOf('public void syncProtectionConfig');
const startStart = source.plugin.indexOf('public void startProtectionService', syncStart + 1);
if (syncStart < 0 || startStart <= syncStart) {
  findings.push(`${paths.plugin}: Could not isolate syncProtectionConfig.`);
} else if (source.plugin.slice(syncStart, startStart).includes('.apply()')) {
  findings.push(`${paths.plugin}: syncProtectionConfig must not use SharedPreferences.apply().`);
}
requirePattern(
  'plugin',
  /startProtectionService\(PluginCall call\)[\s\S]*expectedConfigGeneration[\s\S]*matchesCurrentGeneration\(context, expectedConfigGeneration\)[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*hasFreshProtectionStartRequestForCurrentConfig\(context\)[\s\S]*START_FAILED[\s\S]*recordProtectionStartRequested\(context, expectedConfigGeneration\)/,
  'App start must reject stale/missing current or pending config generations before activation/dispatch.',
);
requirePattern(
  'plugin',
  /hasFreshProtectionStartRequestForCurrentConfig\(Context context\)[\s\S]*isCurrentRequestGeneration\(preferences\)[\s\S]*hasFreshPendingStartRequest/,
  'A pending start is idempotent only while its request config generation is still current.',
);
requirePattern(
  'plugin',
  /recordProtectionStartRequested\(Context context, String expectedConfigGeneration\)[\s\S]*expected\.equals\(current\)[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, true\)[\s\S]*putLong\(LAST_START_REQUEST_AT_KEY, requestAt\)[\s\S]*putString\(ProtectionConfigDurabilityStore\.START_REQUEST_CONFIG_GENERATION_KEY, current\)[\s\S]*\.commit\(\)/,
  'Activation intent, request timestamp and exact config generation must be one commit.',
);
requirePattern(
  'plugin',
  /recordProtectionServiceStarted\(Context context\)[\s\S]*isCurrentRequestGeneration\(preferences\)[\s\S]*START_FAILED[\s\S]*FAILED_CLOSED[\s\S]*putLong\(LAST_START_AT_KEY/,
  'Foreground confirmation must fail closed when config changes after the start request.',
);
requirePattern(
  'plugin',
  /recordProtectionStartRequested\(Context context\)[\s\S]*ensureGenerationForExistingConfig\(context\)[\s\S]*recordProtectionStartRequested\(context, generation\)/,
  'Boot/update compatibility must bootstrap only a validated durable config generation.',
);

requirePattern(
  'boot',
  /hasFreshProtectionStartRequest\(context\)[\s\S]*hasFreshProtectionStartRequestForCurrentConfig\(context\)[\s\S]*recovery_start_failed[\s\S]*recordProtectionStartRequested\(context\)/,
  'Boot/app-update recovery must reject a fresh pending request whose config generation is stale.',
);

requirePattern(
  'bridge',
  /CONFIG_GENERATION_PATTERN[\s\S]*normalizeConfigGeneration[\s\S]*syncCommittedConfig[\s\S]*configGeneration/,
  'TypeScript bridge must validate the native durable config UUID before use.',
);
requirePattern(
  'bridge',
  /async start[\s\S]*syncCommittedConfig[\s\S]*startProtectionService\(\{[\s\S]*expectedConfigGeneration: synced\.configGeneration/,
  'Normal Android start must forward the exact generation returned by durable sync.',
);
requirePattern(
  'bridge',
  /recoverAfterProcessLoss[\s\S]*syncCommittedConfig[\s\S]*startProtectionService\(\{[\s\S]*expectedConfigGeneration: synced\.configGeneration/,
  'Process-loss recovery must forward the exact generation returned by durable sync.',
);
requirePattern(
  'bridgeTest',
  /starts only with the exact durable config generation returned by native sync[\s\S]*expectedConfigGeneration: CONFIG_GENERATION/,
  'Vitest must prove normal start forwards the durable generation.',
);
requirePattern(
  'bridgeTest',
  /fails closed before start when native sync does not confirm a valid config generation[\s\S]*startProtectionServiceMock\)\.not\.toHaveBeenCalled/,
  'Vitest must prove missing/invalid generation blocks service start.',
);

requirePattern(
  'diagnostics',
  /protectionConfigGeneration[\s\S]*startRequestConfigGeneration/,
  'Native diagnostics must expose current and request-bound config generations.',
);
requirePattern(
  'diagnosticsBridge',
  /protectionConfigGeneration:\s*string[\s\S]*startRequestConfigGeneration:\s*string/,
  'TypeScript diagnostics must type both config-generation fields.',
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
requirePattern(
  'instrumentation',
  /freshPendingRequestFromPreviousConfigIsNotCurrent[\s\S]*hasFreshProtectionStartRequest\(context\)[\s\S]*hasFreshProtectionStartRequestForCurrentConfig\(context\)[\s\S]*assertFalse/,
  'Instrumentation must prove a fresh timestamp alone cannot make a stale-config request current.',
);
requirePattern(
  'instrumentation',
  /configChangeBeforeConfirmationFailsClosedWithoutConfirmingOldRequest[\s\S]*FAILED_CLOSED[\s\S]*assertFalse\(ScrollShieldNativePlugin\.isProtectionEnabled[\s\S]*START_FAILED/,
  'Instrumentation must prove config drift before confirmation fails closed without confirming the old request.',
);

for (const id of ['APP-07', 'APP-08']) {
  requirePattern('matrix', new RegExp(`\\| ${id} \\|`), `Device matrix is missing ${id}.`);
}
requirePattern(
  'spec',
  /commit\(\)[\s\S]*configGeneration[\s\S]*expectedConfigGeneration[\s\S]*startRequestConfigGeneration[\s\S]*APP-07[\s\S]*APP-08/,
  'Durability spec must document the commit/generation handshake and real device evidence.',
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
  'Protection config durability check passed. Config sync is commit-based; starts, pending idempotency, recovery and confirmation remain bound to the exact durable config generation.',
);