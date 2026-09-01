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
  ['START_FAILED', 'start_failed'],
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
  'Text classification must remain documented as a compatibility fallback, not the primary stop contract.',
);

requirePattern(
  pluginPath,
  plugin,
  /recordProtectionSystemStop\([\s\S]*synchronized \(EVENT_LOCK\)[\s\S]*putBoolean\(SERVICE_ENABLED_KEY, false\)[\s\S]*putString\(EVENT_QUEUE_KEY, events\.toString\(\)\)[\s\S]*putLong\(LAST_STOP_AT_KEY, timestamp\)[\s\S]*putString\(LAST_STOP_CODE_KEY, normalizedCode\)[\s\S]*putString\(LAST_STOP_MESSAGE_KEY, normalizedMessage\)[\s\S]*\.commit\(\)/,
  'System-stop persistence must atomically commit disabled state, event queue, timestamp, exact code, and message under EVENT_LOCK.',
);
requirePattern(
  pluginPath,
  plugin,
  /recordProtectionSystemStop[\s\S]*event\.put\("type", "warning"\)[\s\S]*event\.put\("appId", "system"\)[\s\S]*event\.put\("desc", normalizedMessage\)/,
  'The atomic system-stop transaction must append the user-visible warning to the same event-queue commit.',
);
requirePattern(
  pluginPath,
  plugin,
  /recordProtectionPrerequisiteStop\([\s\S]*return recordProtectionSystemStop\(context, reasonCode, description\)/,
  'The prerequisite helper must remain a compatibility alias to the generic atomic system-stop transaction.',
);
requirePattern(
  pluginPath,
  plugin,
  /persistProtectionSystemStopWithFallback\([\s\S]*recordProtectionSystemStop\(context, reasonCode, description\)[\s\S]*if \(!persisted\)[\s\S]*setProtectionEnabled\(context, false\)[\s\S]*recordProtectionStop\(context, reasonCode, description\)/,
  'The shared system-stop wrapper must use the atomic transaction first and retain only an explicit fail-closed fallback for commit failure.',
);

requirePattern(
  servicePath,
  service,
  /stopForProtectionPrerequisite\(String reasonCode, String description\)[\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*explicitStopRequested = true[\s\S]*hideOverlay\(\)[\s\S]*persistProtectionSystemStopWithFallback\([\s\S]*reasonCode,[\s\S]*description[\s\S]*ProtectionServiceDispatchGuard\.dispatchControlledStop\(this\)/,
  'Service prerequisite shutdown must serialize atomic system-stop persistence and controlled Android stop dispatch under the shared dispatch lock.',
);

const helperStart = service.indexOf('private void stopForProtectionPrerequisite');
const nextMethod = service.indexOf('private String getForegroundPackage', helperStart + 1);
if (helperStart < 0 || nextMethod <= helperStart) {
  findings.push(`${servicePath}: Could not isolate stopForProtectionPrerequisite helper.`);
} else {
  const helperBody = service.slice(helperStart, nextMethod);
  for (const forbidden of [
    'appendProtectionEvent(',
    'setProtectionEnabled(',
    'recordProtectionStop(',
    'stopSelf()',
  ]) {
    if (helperBody.includes(forbidden)) {
      findings.push(
        `${servicePath}: Prerequisite helper must use the centralized atomic stop + controlled dispatch path instead of '${forbidden}'.`,
      );
    }
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
  /private static void rejectProtectionStartPrerequisite\([\s\S]*synchronized \(ProtectionServiceDispatchGuard\.LOCK\)[\s\S]*persistProtectionSystemStopWithFallback\(context, reasonCode, description\)[\s\S]*ProtectionServiceDispatchGuard\.dispatchControlledStop\(context\)[\s\S]*call\.reject\(rejectionMessage\)/,
  'Native start preflight must serialize system-stop evidence and controlled dispatch before rejecting.',
);
requirePattern(
  pluginPath,
  plugin,
  /catch \(RuntimeException error\)[\s\S]*persistProtectionSystemStopWithFallback\([\s\S]*ProtectionStopReasonPolicy\.START_FAILED[\s\S]*Android konnte den Schutzdienst nicht starten[\s\S]*ProtectionServiceDispatchGuard\.dispatchControlledStop\(context\)[\s\S]*call\.reject\("Protection service could not be started", error\)/,
  'Native service-start request exceptions must atomically persist START_FAILED and dispatch a controlled stop before rejecting.',
);
requirePattern(
  servicePath,
  service,
  /catch \(RuntimeException error\)[\s\S]*RUNNING\.set\(false\)[\s\S]*explicitStopRequested = true[\s\S]*persistProtectionSystemStopWithFallback\([\s\S]*ProtectionStopReasonPolicy\.START_FAILED[\s\S]*Android konnte den Foreground-Schutzdienst nicht starten[\s\S]*ProtectionServiceDispatchGuard\.dispatchControlledStop\(this\)/,
  'Foreground start failure must atomically persist START_FAILED and use controlled stop dispatch.',
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
    if (new RegExp(`call\\.reject\\("${bareReject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(startMethodBody)) {
      findings.push(
        `${pluginPath}: startProtectionService must not directly reject prerequisite '${bareReject}' without atomic persistence.`,
      );
    }
  }
}

requirePattern(
  policyTestPath,
  policyTest,
  /void\s+exposesStablePrerequisiteStopCodes\s*\([\s\S]*START_FAILED/,
  'Pure-Java JUnit must lock prerequisite and technical start-failure code values.',
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
  'Android instrumentation must inspect disabled state and the real event queue after the compatibility prerequisite stop.',
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
  console.log('Prerequisite/system stop-code contract check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Prerequisite/system stop-code contract check passed. Runtime prerequisites, native preflight, and technical start failures use atomic system-stop evidence plus serialized controlled Android stop dispatch.',
);