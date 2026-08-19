import { spawnSync } from 'node:child_process';

type Step = {
  command: string;
  args: string[];
  required: boolean;
};

const steps: Step[] = [
  { command: 'npm', args: ['run', 'check:runtime'], required: true },
  { command: 'npm', args: ['run', 'check:version'], required: true },
  { command: 'npm', args: ['run', 'check:android'], required: true },
  { command: 'npm', args: ['run', 'check:device-matrix'], required: true },
  { command: 'npm', args: ['run', 'check:lifecycle'], required: true },
  { command: 'npm', args: ['run', 'check:prerequisite-stop-codes'], required: true },
  { command: 'npm', args: ['run', 'check:process-loss'], required: true },
  { command: 'npm', args: ['run', 'check:diagnostic-normalization'], required: true },
  { command: 'npm', args: ['run', 'check:overlay-accessibility'], required: true },
  { command: 'npm', args: ['run', 'check:usage-accounting'], required: true },
  { command: 'npm', args: ['run', 'check:protection-config'], required: true },
  { command: 'npm', args: ['run', 'check:release-surface'], required: true },
  { command: 'npm', args: ['run', 'check:commitment'], required: true },
  { command: 'npm', args: ['run', 'check:subscription-safety'], required: true },
  { command: 'npm', args: ['run', 'check:migration'], required: true },
  { command: 'npm', args: ['run', 'check:release-approval'], required: true },
  { command: 'npm', args: ['run', 'check:transparency'], required: true },
  { command: 'npm', args: ['run', 'check:secrets'], required: true },
  { command: 'npm', args: ['run', 'check:store'], required: true },
  { command: 'npm', args: ['run', 'check:release'], required: false },
  { command: 'npm', args: ['run', 'release:gate'], required: false },
  { command: 'npm', args: ['run', 'android:doctor'], required: false },
];

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const failures: string[] = [];

function runStep(step: Step) {
  if (process.platform === 'win32' && step.command === 'npm') {
    return spawnSync('cmd.exe', ['/d', '/s', '/c', npmCommand, ...step.args], {
      encoding: 'utf8',
    });
  }

  const command = step.command === 'npm' ? npmCommand : step.command;
  return spawnSync(command, step.args, {
    encoding: 'utf8',
  });
}

console.log('ScrollShield readiness report\n');

for (const step of steps) {
  const label = `${step.command} ${step.args.join(' ')}`;
  console.log(`> ${label}`);

  const result = runStep(step);

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  if (output) console.log(output);

  if (result.status === 0) {
    console.log(`OK: ${label}\n`);
    continue;
  }

  const status = step.required ? 'FAILED' : 'ATTENTION';
  console.log(`${status}: ${label}\n`);
  if (step.required) failures.push(label);
}

if (failures.length > 0) {
  console.log(`Readiness report failed. Required checks failed: ${failures.join(', ')}`);
  process.exit(1);
}

console.log(
  'Readiness report completed. Required source checks passed; attention items still require manual environment or release evidence.',
);
