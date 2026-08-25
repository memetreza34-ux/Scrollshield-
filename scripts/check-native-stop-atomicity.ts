import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const javaRoot = 'android/app/src/main/java/app/scrollshield/mobile';
const pluginPath = path.join(javaRoot, 'ScrollShieldNativePlugin.java');
const findings: string[] = [];

async function listJavaFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJavaFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.java')) {
      files.push(fullPath);
    }
  }

  return files;
}

function countMatches(content: string, pattern: RegExp): number {
  return [...content.matchAll(pattern)].length;
}

const javaFiles = await listJavaFiles(javaRoot);
const sources = new Map<string, string>();
for (const file of javaFiles) {
  sources.set(file, await readFile(file, 'utf8'));
}

const plugin = sources.get(pluginPath);
if (!plugin) {
  findings.push(`${pluginPath}: Native protection plugin is missing.`);
} else {
  const directDisableCount = countMatches(
    plugin,
    /\bsetProtectionEnabled\s*\([^;]*?false\s*\)\s*;/g,
  );
  if (directDisableCount !== 2) {
    findings.push(
      `${pluginPath}: Expected exactly two direct disable fallback writes inside the centralized system/terminal wrappers, found ${directDisableCount}.`,
    );
  }

  const directStopDiagnosticCount = countMatches(plugin, /\brecordProtectionStop\s*\(/g);
  if (directStopDiagnosticCount !== 3) {
    findings.push(
      `${pluginPath}: Expected recordProtectionStop only as its declaration plus the two centralized fallback calls, found ${directStopDiagnosticCount} occurrences.`,
    );
  }

  for (const [methodName, primaryCall] of [
    ['persistProtectionSystemStopWithFallback', 'recordProtectionSystemStop'],
    ['persistProtectionTerminalStopWithFallback', 'recordProtectionTerminalStop'],
  ] as const) {
    const methodStart = plugin.indexOf(`public static void ${methodName}`);
    const nextMethod = plugin.indexOf('\n    public ', methodStart + 1);
    if (methodStart < 0) {
      findings.push(`${pluginPath}: Missing centralized fallback wrapper ${methodName}.`);
      continue;
    }

    const methodBody = plugin.slice(methodStart, nextMethod > methodStart ? nextMethod : undefined);
    const primaryIndex = methodBody.indexOf(primaryCall);
    const fallbackIndex = methodBody.indexOf('if (!persisted)');
    const disableIndex = methodBody.indexOf('setProtectionEnabled(context, false)');
    const diagnosticIndex = methodBody.indexOf('recordProtectionStop(context, reasonCode, description)');

    if (
      primaryIndex < 0 ||
      fallbackIndex < primaryIndex ||
      disableIndex < fallbackIndex ||
      diagnosticIndex < disableIndex
    ) {
      findings.push(
        `${pluginPath}: ${methodName} must remain atomic-first and may use direct disable/diagnostic writes only after commit failure.`,
      );
    }
  }
}

for (const [file, source] of sources) {
  if (file === pluginPath) continue;

  if (/\bsetProtectionEnabled\s*\(/.test(source)) {
    findings.push(
      `${file}: Production callers must not call setProtectionEnabled directly; use the atomic system/terminal stop wrappers.`,
    );
  }
  if (/\brecordProtectionStop\s*\(/.test(source)) {
    findings.push(
      `${file}: Production callers must not call recordProtectionStop directly; use the atomic system/terminal stop wrappers.`,
    );
  }
}

if (findings.length > 0) {
  console.log('Native stop atomicity check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  `Native stop atomicity check passed. ${javaFiles.length} production Java files were scanned; direct disable/diagnostic fallback writes remain confined to the two centralized commit-failure wrappers.`,
);
