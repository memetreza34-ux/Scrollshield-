import { readFile } from 'node:fs/promises';

const servicePath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldProtectionService.java';
const policyPath =
  'android/app/src/main/java/app/scrollshield/mobile/ProtectionStopReasonPolicy.java';
const policyTestPath =
  'android/app/src/test/java/app/scrollshield/mobile/ProtectionStopReasonPolicyTest.java';
const diagnosticsTestPath =
  'android/app/src/androidTest/java/app/scrollshield/mobile/ProtectionDiagnosticsInstrumentedTest.java';

const [service, policy, policyTest, diagnosticsTest] = await Promise.all([
  readFile(servicePath, 'utf8'),
  readFile(policyPath, 'utf8'),
  readFile(policyTestPath, 'utf8'),
  readFile(diagnosticsTestPath, 'utf8'),
]);

const findings: string[] = [];

const requirePattern = (file: string, content: string, pattern: RegExp, message: string) => {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
};

for (const [constant, value] of [
  ['USAGE_ACCESS_MISSING', 'usage_access_missing'],
  ['OVERLAY_PERMISSION_MISSING', 'overlay_permission_missing'],
  ['NOTIFICATIONS_MISSING', 'notifications_missing'],
  ['NO_ACTIVE_RULES', 'no_active_rules'],
  ['TARGET_APP_MISSING', 'target_app_missing'],
  ['RECOVERY_START_FAILED', 'recovery_start_failed'],
  ['SYSTEM_WARNING', 'system_warning'],
]) {
  requirePattern(
    policyPath,
    policy,
    new RegExp(`static final String ${constant} = "${value}"`),
    `Stable stop-code constant ${constant} must remain ${value}.`,
  );
}

requirePattern(
  policyPath,
  policy,
  /Compatibility fallback[\s\S]*classifySystemWarning/,
  'Text classification must remain documented as a compatibility fallback, not the new service contract.',
);

requirePattern(
  servicePath,
  service,
  /stopForProtectionPrerequisite\(String reasonCode, String description\)[\s\S]*setProtectionEnabled\(this, false\)[\s\S]*appendProtectionEvent\(this, "warning", "system", description\)[\s\S]*recordProtectionStop\(this, reasonCode, description\)[\s\S]*stopSelf\(\)/,
  'Prerequisite shutdown must persist the explicit reason code after the warning event and fail closed.',
);

for (const constant of [
  'USAGE_ACCESS_MISSING',
  'OVERLAY_PERMISSION_MISSING',
  'NOTIFICATIONS_MISSING',
  'NO_ACTIVE_RULES',
  'TARGET_APP_MISSING',
]) {
  requirePattern(
    servicePath,
    service,
    new RegExp(`stopForProtectionPrerequisite\\(\\s*ProtectionStopReasonPolicy\\.${constant}`),
    `Protection service must use explicit ${constant} instead of deriving it from localized text.`,
  );
}

if (/stopForMissingPermission\s*\(/.test(service)) {
  findings.push(
    `${servicePath}: Legacy stopForMissingPermission path must not return; prerequisite failures need explicit stable codes.`,
  );
}

requirePattern(
  policyTestPath,
  policyTest,
  /void\s+exposesStablePrerequisiteStopCodes\s*\(/,
  'Pure-Java JUnit must lock the stable prerequisite code values.',
);
requirePattern(
  policyTestPath,
  policyTest,
  /legacyTextFallbackStillClassifiesPermissionAndConfigurationFailures/,
  'Legacy description classification must retain regression coverage while older callers exist.',
);
requirePattern(
  diagnosticsTestPath,
  diagnosticsTest,
  /void\s+explicitPrerequisiteCodesPersistIndependentOfMessageLanguage\s*\(/,
  'Android instrumentation must prove explicit codes do not depend on localized human-readable messages.',
);
requirePattern(
  diagnosticsTestPath,
  diagnosticsTest,
  /recordProtectionStop\(context, code, message\)[\s\S]*getLastProtectionStopCode\(context\)/,
  'Android instrumentation must exercise the actual persisted explicit-code path.',
);

if (findings.length > 0) {
  console.log('Prerequisite stop-code contract check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Prerequisite stop-code contract check passed. Active-service prerequisite failures use explicit stable codes; localized text parsing is legacy-only.',
);
