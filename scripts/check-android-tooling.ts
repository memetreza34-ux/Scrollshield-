import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findAndroidSdk } from './android-env';

type Finding = {
  label: string;
  detail: string;
};

const findings: Finding[] = [];

function commandExists(command: string): boolean {
  const checker = process.platform === 'win32' ? 'where' : 'command';
  const args = process.platform === 'win32' ? [command] : ['-v', command];
  const result = spawnSync(checker, args, { shell: process.platform !== 'win32', stdio: 'ignore' });
  return result.status === 0;
}

if (!existsSync('android')) {
  findings.push({
    label: 'Android project missing',
    detail: 'Run `npx cap add android` before using native Android commands.',
  });
}

if (!process.env.JAVA_HOME && !commandExists('java')) {
  findings.push({
    label: 'Java missing',
    detail: 'Install Java 21 or newer and set JAVA_HOME or add java to PATH.',
  });
}

const androidSdk = findAndroidSdk();
if (!androidSdk) {
  findings.push({
    label: 'Android SDK missing',
    detail: 'Install Android Studio or Android command-line tools with SDK Platform 36.',
  });
}

const localPropertiesPath = path.join('android', 'local.properties');
if (existsSync('android') && !existsSync(localPropertiesPath)) {
  findings.push({
    label: 'local.properties missing',
    detail: `Copy android/local.properties.example to ${localPropertiesPath} and set sdk.dir=<absolute Android SDK path>.`,
  });
}

if (existsSync(localPropertiesPath)) {
  const localProperties = readFileSync(localPropertiesPath, 'utf8');
  if (!/^sdk\.dir=.+/m.test(localProperties)) {
    findings.push({
      label: 'Android SDK path missing',
      detail: `${localPropertiesPath} must contain sdk.dir=<absolute Android SDK path>.`,
    });
  }
}

const signingPropertiesPath = path.join('android', 'signing.properties');
if (existsSync(signingPropertiesPath)) {
  const signingProperties = readFileSync(signingPropertiesPath, 'utf8');
  const requiredSigningKeys = ['storeFile', 'storePassword', 'keyAlias', 'keyPassword'];

  for (const key of requiredSigningKeys) {
    if (new RegExp(`^${key}=.+`, 'm').test(signingProperties)) continue;
    findings.push({
      label: 'Android signing property missing',
      detail: `${signingPropertiesPath} must contain ${key}=<value>.`,
    });
  }

  const storeFile = signingProperties.match(/^storeFile=(.+)$/m)?.[1]?.trim();
  if (storeFile && !existsSync(path.join('android', storeFile))) {
    findings.push({
      label: 'Android signing keystore missing',
      detail: `${signingPropertiesPath} points to ${storeFile}, but that file does not exist under android/.`,
    });
  }
}

if (findings.length > 0) {
  console.log('Android tooling check failed:\n');
  for (const finding of findings) {
    console.log(`- ${finding.label}: ${finding.detail}`);
  }
  process.exit(1);
}

console.log(`Android tooling check passed. SDK: ${androidSdk ?? 'configured via local.properties'}.`);
