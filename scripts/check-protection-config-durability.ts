import { readFile } from 'node:fs/promises';

const javaRoot = 'android/app/src/main/java/app/scrollshield/mobile';
const androidTestRoot = 'android/app/src/androidTest/java/app/scrollshield/mobile';
const paths = {
  store: `${javaRoot}/ProtectionConfigDurabilityStore.java`,
  certaintyPolicy: `${javaRoot}/ProtectionConfigWriteCertaintyPolicy.java`,
  plugin: `${javaRoot}/ScrollShieldNativePlugin.java`,
  service: `${javaRoot}/ScrollShieldProtectionService.java`,
  bridge: 'src/lib/nativeProtection.ts',
  bridgeTest: 'src/lib/nativeProtection.test.ts',
  preparedStartTest: 'src/lib/nativeProtectionPreparedStart.test.ts',
  diagnostics: `${javaRoot}/ScrollShieldDiagnosticsPlugin.java`,
  diagnosticsBridge: 'src/lib/nativeDiagnostics.ts',
  debug: 'src/screens/DebugScreen.tsx',
  debugTest: 'src/screens/DebugScreen.test.tsx',
  instrumentation: `${androidTestRoot}/ProtectionConfigDurabilityInstrumentedTest.java`,
  matrix: 'docs/ANDROID_DEVICE_TEST_MATRIX.md',
  spec: 'docs/PROTECTION_CONFIG_DURABILITY.md',
} as const;

type Key = keyof typeof paths;
const entries = await Promise.all(
  Object.entries(paths).map(async ([key, file]) => [key, await readFile(file, 'utf8')] as const),
);
const source = Object.fromEntries(entries) as Record<Key, string>;
const findings: string[] = [];
function requirePattern(key: Key, pattern: RegExp, message: string) {
  if (!pattern.test(source[key])) findings.push(`${paths[key]}: ${message}`);
}
function forbidText(key: Key, text: string, message: string) {
  if (source[key].includes(text)) findings.push(`${paths[key]}: ${message}`);
}

requirePattern(
  'store',
  /CONFIG_GENERATION_KEY[\s\S]*START_REQUEST_CONFIG_GENERATION_KEY[\s\S]*commitConfig[\s\S]*UUID\.randomUUID[\s\S]*\.commit\(\)/,
  'Config store must durably commit config metadata and a new generation before reporting success.',
);
forbidText('store', '.apply()', 'Start-critical config durability must never use SharedPreferences.apply().');
requirePattern(
  'store',
  /PreviousState[\s\S]*previousConfig[\s\S]*previousUnavailableApps[\s\S]*previousUnavailableActiveApps[\s\S]*previousGeneration[\s\S]*restorePreviousState/,
  'Candidate config write must snapshot the complete previous durable tuple for rollback.',
);
requirePattern(
  'store',
  /if \(!persisted\)[\s\S]*restorePreviousState[\s\S]*rollbackPersisted[\s\S]*ProtectionConfigWriteCertaintyPolicy/,
  'Failed candidate write must restore previous tuple and update certainty from rollback result.',
);
requirePattern(
  'certaintyPolicy',
  /candidatePersisted[\s\S]*rollbackPersisted/,
  'Write-certainty policy must distinguish candidate success from rollback success.',
);
requirePattern(
  'store',
  /isWriteStateCertain[\s\S]*matchesCurrentGeneration[\s\S]*isCurrentRequestGeneration/,
  'Config certainty must gate current-generation and current-request acceptance.',
);

requirePattern(
  'plugin',
  /syncProtectionConfig\(PluginCall call\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*commitConfig[\s\S]*commitResult\.persisted[\s\S]*configGeneration/,
  'Native config sync must serialize and return a generation only after durable commit.',
);
requirePattern(
  'plugin',
  /startProtectionService\(PluginCall call\)[\s\S]*expectedConfigGeneration[\s\S]*matchesCurrentGeneration\(context, expectedConfigGeneration\)[\s\S]*recordProtectionStartRequested\(context, expectedConfigGeneration\)/,
  'Native start must validate exact durable config generation before request persistence.',
);
requirePattern(
  'plugin',
  /requireLifecycleSnapshot[\s\S]*matchesLifecycleSnapshot[\s\S]*call\.resolve\(\);[\s\S]*matchesCurrentGeneration/,
  'Automatic restart snapshot mismatch must no-op before config/start error evidence.',
);

requirePattern(
  'bridge',
  /syncCommitted\([\s\S]*syncCommittedConfig\(appsConfig, focusMode\)/,
  'Bridge must expose the durable config generation returned by native sync.',
);
requirePattern(
  'bridge',
  /startCommitted\([\s\S]*normalizeConfigGeneration[\s\S]*AndroidProtection\.startProtectionService\(options\)/,
  'Bridge must expose start of an already committed generation.',
);
requirePattern(
  'bridge',
  /async start\(appsConfig[\s\S]*const synced = await this\.syncCommitted\(appsConfig, focusMode\)[\s\S]*await this\.startCommitted\(synced\.configGeneration\)/,
  'Normal user start must still perform exactly one durable sync and start that committed generation.',
);
requirePattern(
  'preparedStartTest',
  /starts an already committed generation without performing a second config sync[\s\S]*syncProtectionConfigMock\)\.toHaveBeenCalledTimes\(1\)/,
  'Prepared-start Vitest must prove generation reuse does not perform a second config sync.',
);
requirePattern(
  'bridgeTest',
  /starts only with the exact durable config generation returned by native sync[\s\S]*expectedConfigGeneration: CONFIG_GENERATION/,
  'Normal-start Vitest must retain exact durable generation forwarding.',
);

requirePattern(
  'service',
  /refreshConfiguration\(\)[\s\S]*isWriteStateCertain\(\)[\s\S]*configJson[\s\S]*configGeneration[\s\S]*nextRulesByPackage[\s\S]*isWriteStateCertain\(\)[\s\S]*latestConfigJson[\s\S]*latestConfigGeneration/,
  'Running service must publish only a stable twice-checked certain config snapshot.',
);
requirePattern(
  'service',
  /recordAllowedUsage\(null, generationBoundaryAt\)[\s\S]*cachedConfigGeneration[\s\S]*rulesByPackage\.clear\(\)/,
  'Old-generation usage must close before runtime rule publication changes.',
);
requirePattern(
  'service',
  /if \(!incrementEmergencyCount\(rule\.id, actionTime\)\) return;[\s\S]*appendProtectionEvent[\s\S]*"emergency"[\s\S]*\)\) return;[\s\S]*temporaryAccessUntil\.put/,
  'Emergency grant may exist only after durable counter and event evidence.',
);
requirePattern(
  'service',
  /if \(!recordIntentionalOpen\(rule\.id, actionTime\)\) return;[\s\S]*appendProtectionEvent[\s\S]*"open"[\s\S]*\)\) return;[\s\S]*temporaryAccessUntil\.put/,
  'Intentional-open grant may exist only after durable history and event evidence.',
);

requirePattern(
  'diagnostics',
  /protectionConfigGeneration[\s\S]*protectionConfigWriteStateCertain[\s\S]*protectionRuntimeConfigGeneration[\s\S]*startRequestConfigGeneration/,
  'Native diagnostics must expose persisted/certainty/runtime/request generation evidence.',
);
requirePattern(
  'diagnosticsBridge',
  /protectionConfigGeneration:\s*string[\s\S]*protectionConfigWriteStateCertain:\s*boolean[\s\S]*protectionRuntimeConfigGeneration:\s*string[\s\S]*startRequestConfigGeneration:\s*string/,
  'TypeScript diagnostics must type config durability evidence.',
);
requirePattern(
  'debug',
  /Config-Schreibzustand[\s\S]*Config-Generation[\s\S]*Runtime-Config[\s\S]*Startrequest-Config/,
  'Debug UI must expose config certainty and generation evidence.',
);
requirePattern(
  'debugTest',
  /protectionRuntimeConfigGeneration[\s\S]*Runtime-Config/,
  'Debug test must cover runtime generation evidence.',
);

for (const method of [
  'durableConfigGenerationBindsStartRequestAndConfirmation',
  'staleConfigGenerationCannotCreateStartRequest',
  'freshPendingRequestFromPreviousConfigIsNotCurrent',
  'configChangeBeforeConfirmationFailsClosedWithoutConfirmingOldRequest',
  'legacyDurableConfigReceivesGenerationBeforeBootStyleStartRequest',
]) {
  requirePattern(
    'instrumentation',
    new RegExp(`void\\s+${method}\\s*\\(`),
    `Missing config instrumentation ${method}.`,
  );
}
for (const id of ['APP-07', 'APP-08', 'APP-09', 'APP-10']) {
  requirePattern('matrix', new RegExp(`\\| ${id} \\|`), `Device matrix is missing ${id}.`);
}
requirePattern(
  'spec',
  /candidate[\s\S]*rollback[\s\S]*UNSICHER[\s\S]*Runtime/iu,
  'Config durability spec must retain rollback/certainty/runtime semantics.',
);

if (findings.length > 0) {
  console.log('Protection config durability check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Protection config durability check passed. Config commit/rollback/certainty, committed-generation start reuse, runtime publication and durable-before-grant evidence remain source-guarded.',
);
