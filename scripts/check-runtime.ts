import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';

type PackageJson = {
  engines?: {
    node?: string;
    npm?: string;
  };
};

function parseVersion(version: string): [number, number, number] {
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`Unable to parse version: ${version}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(actual: string, minimum: string): number {
  const actualParts = parseVersion(actual);
  const minimumParts = parseVersion(minimum);

  for (let index = 0; index < actualParts.length; index += 1) {
    if (actualParts[index] > minimumParts[index]) return 1;
    if (actualParts[index] < minimumParts[index]) return -1;
  }

  return 0;
}

function minimumFromRange(range: string | undefined): string | undefined {
  return range?.match(/>=\s*(\d+\.\d+\.\d+)/)?.[1];
}

const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as PackageJson;
const requiredNode = minimumFromRange(packageJson.engines?.node);
const requiredNpm = minimumFromRange(packageJson.engines?.npm);
const actualNode = process.versions.node;
const npmUserAgentVersion = process.env.npm_config_user_agent?.match(/npm\/(\d+\.\d+\.\d+)/)?.[1];
const actualNpm = npmUserAgentVersion ?? execSync('npm --version', { encoding: 'utf8' }).trim();
const findings: string[] = [];

if (!requiredNode) {
  findings.push('package.json must declare engines.node with a >= minimum version.');
} else if (compareVersions(actualNode, requiredNode) < 0) {
  findings.push(`Node ${actualNode} is too old. Required: ${packageJson.engines?.node}.`);
}

if (!requiredNpm) {
  findings.push('package.json must declare engines.npm with a >= minimum version.');
} else if (compareVersions(actualNpm, requiredNpm) < 0) {
  findings.push(`npm ${actualNpm} is too old. Required: ${packageJson.engines?.npm}.`);
}

if (findings.length > 0) {
  console.log('Runtime check failed:\n');
  for (const finding of findings) {
    console.log(`- ${finding}`);
  }
  process.exit(1);
}

console.log(`Runtime check passed. Node ${actualNode}, npm ${actualNpm}.`);
