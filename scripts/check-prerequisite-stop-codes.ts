import { readFile } from 'node:fs/promises';

const servicePath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldProtectionService.java';
const pluginPath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldNativePlugin.java';
const policyPath =
  'android/app/src/main/java/app/scrollshield/mobile/ProtectionStopReasonPolicy.java';
const policyTestPath =
  'android/app/src/test/java/app/scrollshield/mobile/ProtectionStopReasonPolicyTest.java';
const diagnosticsTestPath =
  'android/app/src/androidTest/java/app/scrollshield/mobile/ProtectionDiagnosticsInstrumentedTest.java';

const [service, plugin, policy, policyTest, diagnosticsTest] = await Promise.all([
  readFile(servicePath, 'utf8'),
  readFile(pluginPath, 'utf8'),
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
  pluginPath,
  plugin,
  /recordProtectionPrerequisiteStop\([\s\S]*synchronized \(EVENT_LOCK\)[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, false\)[\s\S]*putString\(EVENT_QUEUE_KEY, events\.toString\(\)\)[\s\S]*putLong\(LAST_STOP_AT_KEY, timestamp\)[\s\S]*putString\(LAST_STOP_CODE_KEY, normalizedCode\)[\s\S]*putString\(LAST_STOP_MESSAGE_KEY, normalizedMessage\)[\s\S]*\.commit\(\)/,
  'Prerequisite stop persistence must atomically commit disabled state, event queue, timestamp, exact code, and message under EVENT_LOCK.',
);
requirePattern(
  pluginPath,
  plugin,
  /recordProtectionPrerequisiteStop[\s\S]*event\.put\("type", "warning"\)[\s\S]*event\.put\("appId", "system"\)[\s\S]*event\.put\("desc", normalizedMessage\)/,
  'The atomic prerequisite transaction must append the user-visible system warning to the same event queue write.',
);

requirePattern(
  servicePath,
  service,
  /stopForProtectionPrerequisite\(String reasonCode, String description\)[\s\S]*recordProtectionPrerequisiteStop\([\s\S]*reasonCode,[\s\S]*description[\s\S]*if \(!persisted\)[\s\S]*setProtectionEnabled\(this, false\)[\s\S]*recordProtectionStop\(this, reasonCode, description\)[\s\S]*stopSelf\(\)/,
  'Service prerequisite shutdown must use the atomic native transaction first and retain an explicit fail-closed fallback only for commit failure.',
);

const helperStart = service.indexOf('private void stopForProtectionPrerequisite');
const nextMethod = service.indexOf('private String getForegroundPackage', helperStart + 1);
if (helperStart < 0 || nextMethod <= helperStart) {
  findings.push(`${servicePath}: Could not isolate stopForProtectionPrerequisite helper.`);
} else {
  const helperBody = service.slice(helperStart, nextMethod);
  if (helperBody.includes('appendProtectionEvent(')) {
    findings.push(
      `${servicePath}: Prerequisite helper must not perform a separate warning-event commit before the atomic transaction.`,
    );
  }
}

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
  pluginPath,
  plugin,
  /private static void rejectProtectionStartPrerequisite\([\s\S]*recordProtectionPrerequisiteStop\(context, reasonCode, description\)[\s\S]*if \(!persisted\)[\s\S]*setProtectionEnabled\(context, false\)[\s\S]*recordProtectionStop\(context, reasonCode, description\)[\s\S]*call\.reject\(rejectionMessage\)/,
  'Native start preflight must atomically persist a stable prerequisite stop before rejecting and keep only an explicit fail-closed fallback for commit failure.',
);

const startMethodStart = plugin.indexOf('public void startProtectionService');
const startHelperStart = plugin.indexOf('private static void rejectProtectionStartPrerequisite', startMethodStart + 1);
if (startMethodStart < 0 || startHelperStart <= startMethodStart) {
  findings.push(`${pluginPath}: Could not isolate startProtectionService preflight.`);
} else {
  const startMethodBody = plugin.slice(startMethodStart, startHelperStart);
  for (const constant of [
    'USAGE_ACCESS_MISSING',
    'OVERLAY_PERMISSION_MISSING',
    'NOTIFICATIONS_MISSING',
    'TARGET_APP_MISSING',
  ]) {
    if (
      !new RegExp(
        `rejectProtectionStartPrerequisite\\([\\s\\S]*?ProtectionStopReasonPolicy\\.${constant}`,
      ).test(startMethodBody)
    ) {
      findings.push(
        `${pluginPath}: startProtectionService must persist ${constant} through rejectProtectionStartPrerequisite before rejecting.`,
      );
    }
  }

  for (const bareReject of [
    'Usage Access is required before protection can start',
    'Overlay permission is required before protection can start',
    'Notifications are required so active protection and its stop action remain visible',
    'At least one installed active protected app is required',
  ]) {
    if (new RegExp(`call\\.reject\\(\"${bareReject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\"`).test(startMethodBody)) {
      findings.push(
        `${pluginPath}: startProtectionService must not directly reject prerequisite '${bareReject}' without atomic persistence.`,
      );
    }
  }
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
  /void\s+atomicPrerequisiteStopPersistsDisabledStateEventAndExactCode\s*\(/,
  'Android instrumentation must cover the atomic disabled-state + event + exact-code transaction.',
);
requirePattern(
  diagnosticsTestPath,
  diagnosticsTest,
  /recordProtectionPrerequisiteStop\([\s\S]*assertFalse\(ScrollShieldNativePlugin\.isProtectionEnabled\(context\)\)[\s\S]*new JSONArray\(preferences\.getString\("protection_events"/,
  'Android instrumentation must inspect disabled state and the real event queue after the atomic prerequisite stop.',
);
requirePattern(
  diagnosticsTestPath,
  diagnosticsTest,
  /void\s+atomicPrerequisiteStopAlsoPersistsWhenProtectionWasAlreadyDisabled\s*\([\s\S]*TARGET_APP_MISSING[\s\S]*assertFalse\(ScrollShieldNativePlugin\.isProtectionEnabled\(context\)\)[\s\S]*protection_events/,
  'Android instrumentation must prove first-start prerequisite failures still persist exact diagnostics and a warning when activation was already false.',
);
requirePattern(
  diagnosticsTestPath,
  diagnosticsTest,
  /void\s+explicitPrerequisiteCodesPersistIndependentOfMessageLanguage\s*\(/,
  'Android instrumentation must prove explicit codes do not depend on localized human-readable messages.',
);

if (findings.length > 0) {
  console.log('Prerequisite stop-code contract check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Prerequisite stop-code contract check passed. Service runtime loss and native start preflight both use the atomic prerequisite transaction for disabled state, event, and exact diagnostics; localized text parsing is legacy-only.',
);