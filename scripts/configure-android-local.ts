import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { findAndroidSdk, gradleSdkPath } from './android-env';

const sdkPath = findAndroidSdk();

if (!sdkPath) {
  console.log('Android SDK not found.');
  console.log('Install Android Studio or Android command-line tools with SDK Platform 36, then rerun this command.');
  console.log('Expected default locations include:');
  console.log('- Windows: %LOCALAPPDATA%\\Android\\Sdk');
  console.log('- macOS: ~/Library/Android/sdk');
  console.log('- Linux: ~/Android/Sdk');
  process.exit(1);
}

const localPropertiesPath = path.join('android', 'local.properties');
await mkdir('android', { recursive: true });
await writeFile(localPropertiesPath, `sdk.dir=${gradleSdkPath(sdkPath)}\n`, 'utf8');

console.log(`Configured ${localPropertiesPath} with SDK: ${sdkPath}`);
