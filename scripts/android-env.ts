import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

export function findAndroidSdk(): string | undefined {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
    path.join(homedir(), 'Library', 'Android', 'sdk'),
    path.join(homedir(), 'Android', 'Sdk'),
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => existsSync(candidate));
}

export function gradleSdkPath(sdkPath: string) {
  return process.platform === 'win32' ? sdkPath.replaceAll('\\', '\\\\') : sdkPath;
}
