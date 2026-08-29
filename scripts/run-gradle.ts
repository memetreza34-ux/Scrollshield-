import { spawnSync } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: tsx scripts/run-gradle.ts <gradle-task> [additional-args]');
  process.exit(1);
}

const safeArgumentPattern = /^[A-Za-z0-9:._=-]+$/;
const unsafeArgument = args.find((arg) => !safeArgumentPattern.test(arg));

if (unsafeArgument) {
  console.error(`Refusing unsafe Gradle argument: ${unsafeArgument}`);
  process.exit(1);
}

const isWindows = process.platform === 'win32';
const wrapper = isWindows ? 'gradlew.bat' : './gradlew';
const result = spawnSync(wrapper, args, {
  cwd: path.resolve('android'),
  stdio: 'inherit',
  shell: isWindows,
});

if (result.error) {
  console.error(`Failed to start Gradle wrapper: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
