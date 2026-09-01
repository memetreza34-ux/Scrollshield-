import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repositoryRoot = process.cwd();
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const gitCommand = isWindows ? 'git.exe' : 'git';

function commandNeedsShell(command) {
  return isWindows && /\.(?:cmd|bat)$/i.test(command);
}

function runText(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: commandNeedsShell(command),
  });
  if (result.status !== 0) return undefined;
  return result.stdout.trim();
}

const commitSha = runText(gitCommand, ['rev-parse', 'HEAD']);
const branch = runText(gitCommand, ['branch', '--show-current']) ?? 'detached';
const trackedChanges = runText(gitCommand, ['status', '--porcelain', '--untracked-files=no']);
const npmVersion = runText(npmCommand, ['--version']) ?? 'unknown';

if (!commitSha) {
  console.error('Unable to resolve the current Git commit. Run this command from the ScrollShield repository root.');
  process.exit(1);
}

if (trackedChanges === undefined) {
  console.error('Unable to inspect the Git working tree.');
  process.exit(1);
}

if (trackedChanges.length > 0) {
  console.error(
    'Local verification requires a clean tracked working tree so evidence can be bound to one exact commit.',
  );
  console.error(trackedChanges);
  process.exit(1);
}

const startedAt = new Date().toISOString();
const timestamp = startedAt.replace(/[:.]/g, '-');
const outputDir = path.join(repositoryRoot, '.scrollshield-verification', `${timestamp}-${commitSha.slice(0, 12)}`);
mkdirSync(outputDir, { recursive: true });

const reportPath = path.join(outputDir, 'verification-report.json');
const report = {
  schemaVersion: 1,
  status: 'running',
  commitSha,
  branch,
  startedAt,
  completedAt: null,
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.version,
  npmVersion,
  androidLocalPropertiesPresentAtStart: existsSync(path.join(repositoryRoot, 'android', 'local.properties')),
  steps: [],
};

function persistReport() {
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

persistReport();

async function runStep(index, id, command, args) {
  const logPath = path.join(outputDir, `${String(index).padStart(2, '0')}-${id}.log`);
  const log = createWriteStream(logPath, { flags: 'w' });
  const stepStartedAt = new Date().toISOString();

  console.log(`\n[${index}] ${command} ${args.join(' ')}`);
  log.write(`# commit: ${commitSha}\n# startedAt: ${stepStartedAt}\n# command: ${command} ${args.join(' ')}\n\n`);

  const child = spawn(command, args, {
    cwd: repositoryRoot,
    env: { ...process.env, CI: 'true' },
    shell: commandNeedsShell(command),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
    log.write(chunk);
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
    log.write(chunk);
  });

  const exitCode = await new Promise((resolve) => {
    child.on('error', (error) => {
      const message = `Failed to start command: ${error.message}\n`;
      process.stderr.write(message);
      log.write(message);
      resolve(1);
    });
    child.on('close', (code) => resolve(code ?? 1));
  });

  const stepCompletedAt = new Date().toISOString();
  log.write(`\n# completedAt: ${stepCompletedAt}\n# exitCode: ${exitCode}\n`);
  await new Promise((resolve) => log.end(resolve));

  report.steps.push({
    id,
    command: [command, ...args].join(' '),
    startedAt: stepStartedAt,
    completedAt: stepCompletedAt,
    exitCode,
    log: path.basename(logPath),
  });
  persistReport();

  return exitCode;
}

const steps = [
  ['lock-sync', 'node', ['scripts/check-package-lock-sync.mjs']],
  ['npm-ci', npmCommand, ['ci']],
];

if (!existsSync(path.join(repositoryRoot, 'android', 'local.properties'))) {
  steps.push(['android-configure', npmCommand, ['run', 'android:configure']]);
}

steps.push(
  ['android-doctor', npmCommand, ['run', 'android:doctor']],
  ['source-verify', npmCommand, ['run', 'verify']],
  ['android-unit-debug-build', npmCommand, ['run', 'verify:android']],
);

for (let index = 0; index < steps.length; index += 1) {
  const [id, command, args] = steps[index];
  const exitCode = await runStep(index + 1, id, command, args);
  if (exitCode !== 0) {
    report.status = 'failed';
    report.failedStep = id;
    report.completedAt = new Date().toISOString();
    persistReport();
    console.error(`\nLocal verification FAILED at '${id}'. Evidence: ${outputDir}`);
    process.exit(exitCode);
  }
}

const finalTrackedChanges = runText(gitCommand, ['status', '--porcelain', '--untracked-files=no']);
if (finalTrackedChanges === undefined || finalTrackedChanges.length > 0) {
  report.status = 'failed';
  report.failedStep = 'working-tree-integrity';
  report.completedAt = new Date().toISOString();
  report.trackedChangesAfterRun = finalTrackedChanges ?? '<git status failed>';
  persistReport();
  console.error(
    '\nVerification commands changed tracked repository files; evidence is not cleanly bound to the starting commit.',
  );
  process.exit(1);
}

report.status = 'passed';
report.completedAt = new Date().toISOString();
persistReport();

console.log(`\nLocal verification PASSED for ${commitSha}.`);
console.log(`Evidence directory: ${outputDir}`);
console.log(
  'This proves only the executed source/unit/debug-build path; physical-device and release gates remain separate.',
);
