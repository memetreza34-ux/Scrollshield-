import { readFile } from 'node:fs/promises';

const policyPath = 'android/app/src/main/java/app/scrollshield/mobile/ProtectionDiagnosticPolicy.java';
const policyTestPath = 'android/app/src/test/java/app/scrollshield/mobile/ProtectionDiagnosticPolicyTest.java';
const pluginPath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldNativePlugin.java';

const [policy, policyTest, plugin] = await Promise.all([
  readFile(policyPath, 'utf8'),
  readFile(policyTestPath, 'utf8'),
  readFile(pluginPath, 'utf8'),
]);

const findings: string[] = [];

const requirePattern = (file: string, content: string, pattern: RegExp, message: string) => {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
};

requirePattern(
  policyPath,
  policy,
  /MAX_CODE_LENGTH = 64[\s\S]*MAX_MESSAGE_LENGTH = 500/,
  'Lifecycle diagnostic code/message bounds must remain explicit.',
);
requirePattern(
  policyPath,
  policy,
  /normalizeCode[\s\S]*toLowerCase\(java\.util\.Locale\.US\)[\s\S]*character == '-' \|\| character == '_'/,
  'Stop codes must normalize to a stable ASCII-safe lowercase identifier shape.',
);
requirePattern(
  policyPath,
  policy,
  /normalizeMessageCharacters[\s\S]*MAX_MESSAGE_LENGTH[\s\S]*Character\.isISOControl[\s\S]*Character\.isWhitespace/,
  'Stop messages must collapse control and repeated whitespace input.',
);
requirePattern(
  policyPath,
  policy,
  /normalizeMessage\(String value, String fallback\)[\s\S]*truncate\(normalized, MAX_MESSAGE_LENGTH\)/,
  'Normalized stop messages must remain bounded to MAX_MESSAGE_LENGTH.',
);
requirePattern(
  policyTestPath,
  policyTest,
  /stableExistingCodesRemainUnchanged[\s\S]*arbitraryCodeInputIsNormalizedAndBounded[\s\S]*emptyCodeFallsBackSafelyButOptionalReadCanRemainEmpty[\s\S]*messageCollapsesControlsAndWhitespace[\s\S]*messageIsBoundedWithoutDroppingUsefulPrefix[\s\S]*emptyMessageFallsBackSafelyButOptionalReadCanRemainEmpty/,
  'JUnit source must guard stable codes, arbitrary input, empty reads, controls, and both length bounds.',
);
requirePattern(
  pluginPath,
  plugin,
  /recordProtectionStop[\s\S]*ProtectionDiagnosticPolicy\.normalizeCode\(code, "unknown_stop"\)[\s\S]*ProtectionDiagnosticPolicy\.normalizeMessage\(message, "Unbekannter Stoppgrund"\)/,
  'Every explicit native stop must normalize code and message before persistence.',
);
requirePattern(
  pluginPath,
  plugin,
  /classifySystemWarning\(description\)[\s\S]*ProtectionDiagnosticPolicy\.normalizeMessage\(description, "Systemwarnung"\)/,
  'System-warning lifecycle persistence must also pass through diagnostic normalization.',
);
requirePattern(
  pluginPath,
  plugin,
  /getLastProtectionStopCode[\s\S]*ProtectionDiagnosticPolicy\.normalizeCode[\s\S]*getString\(LAST_STOP_CODE_KEY, ""\)[\s\S]*getLastProtectionStopMessage[\s\S]*ProtectionDiagnosticPolicy\.normalizeMessage[\s\S]*getString\(LAST_STOP_MESSAGE_KEY, ""\)/,
  'Reads must normalize historical stored values while preserving the valid empty never-stopped state.',
);

for (const stableCode of [
  'manual_app_stop',
  'notification_action_stop',
  'migration_recovery',
  'factory_reset',
  'start_failed',
  'protection_disabled',
  'usage_access_missing',
  'overlay_permission_missing',
  'notifications_missing',
  'no_active_rules',
  'target_app_missing',
  'recovery_start_failed',
  'system_warning',
  'unexpected_service_destroy',
]) {
  requirePattern(
    policyTestPath,
    policyTest,
    new RegExp(`\\b${stableCode}\\b`),
    `Stable lifecycle code is not protected by diagnostic-policy tests: ${stableCode}.`,
  );
}

if (findings.length > 0) {
  console.log('Diagnostic normalization check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Diagnostic normalization check passed. Lifecycle codes remain stable and bounded, messages are control-safe and bounded, explicit/system stops are normalized before persistence, and empty never-stopped reads remain representable.',
);
