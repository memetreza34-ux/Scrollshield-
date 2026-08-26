import { readFile } from 'node:fs/promises';

const javaRoot = 'android/app/src/main/java/app/scrollshield/mobile';
const javaTestRoot = 'android/app/src/test/java/app/scrollshield/mobile';

const paths = {
  packageJson: 'package.json',
  readiness: 'scripts/readiness-report.ts',
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
  /shouldInvalidateRuntimeState\([\s\S]*cachedConfigGeneration,[\s\S]*configGeneration[\s\S]*if \(invalidateRuntimeState\)[\s\S]*temporaryAccessUntil\.clear\(\)[\s\S]*hideOverlay\(\)/,
  'Publishing a new generation must revoke temporary access and remove any old overlay.',
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
  /onDestroy\(\)[\s\S]*publishedConfigGeneration = ""/,
  'Destroy must clear process-visible published config generation evidence.',
);

for (const id of ['RUNTIME-01', 'RUNTIME-02', 'RUNTIME-03', 'RUNTIME-04']) {
  requirePattern('spec', new RegExp(id), `Runtime config spec is missing ${id}.`);
}
requirePattern(
  'spec',
  /temporaryAccessUntil[\s\S]*actionConfigGeneration[\s\S]*UNSICHER[\s\S]*usage/i,
  'Runtime config spec must cover temporary access, stale overlay actions, uncertain writes, and usage-boundary evidence.',
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
  'Runtime config state check passed. Temporary access and overlay actions are generation-scoped; uncertain writes retain only the last published confirmed runtime state.',
);
