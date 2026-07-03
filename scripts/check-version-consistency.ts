import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as { version?: string };
const packageLock = JSON.parse(await readFile('package-lock.json', 'utf8')) as {
  packages?: Record<string, { version?: string }>;
};
const version = packageJson.version;

if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`package.json contains an invalid release version: ${version ?? 'missing'}`);
}

if (packageLock.packages?.['']?.version !== version) {
  throw new Error('package.json and package-lock.json versions do not match.');
}

const viteConfig = await readFile('vite.config.ts', 'utf8');
if (!/__APP_VERSION__:\s*JSON\.stringify\(packageJson\.version\)/.test(viteConfig)) {
  throw new Error('The production build no longer derives __APP_VERSION__ from package.json.');
}

const capacitorConfigPath = 'capacitor.config.ts';
let capacitorAppId: string | undefined;
if (existsSync(capacitorConfigPath)) {
  const capacitorConfig = await readFile(capacitorConfigPath, 'utf8');
  capacitorAppId = capacitorConfig.match(/appId:\s*['"]([^'"]+)['"]/)?.[1];

  if (!capacitorAppId) {
    throw new Error(`${capacitorConfigPath} must define appId.`);
  }
}

const androidGradleCandidates = ['android/app/build.gradle', 'android/app/build.gradle.kts'];
for (const candidate of androidGradleCandidates) {
  if (!existsSync(candidate)) continue;
  const gradle = await readFile(candidate, 'utf8');
  const nativeVersion = gradle.match(/versionName\s*[=(]?\s*["']([^"']+)["']/)?.[1];
  if (nativeVersion !== version) {
    throw new Error(`${candidate} versionName (${nativeVersion ?? 'missing'}) must equal ${version}.`);
  }

  const namespace = gradle.match(/namespace\s*[=(]?\s*["']([^"']+)["']/)?.[1];
  const applicationId = gradle.match(/applicationId\s*[=(]?\s*["']([^"']+)["']/)?.[1];

  if (capacitorAppId && namespace !== capacitorAppId) {
    throw new Error(`${candidate} namespace (${namespace ?? 'missing'}) must equal Capacitor appId ${capacitorAppId}.`);
  }

  if (capacitorAppId && applicationId !== capacitorAppId) {
    throw new Error(
      `${candidate} applicationId (${applicationId ?? 'missing'}) must equal Capacitor appId ${capacitorAppId}.`,
    );
  }
}

const androidStringsPath = path.join('android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (capacitorAppId && existsSync(androidStringsPath)) {
  const androidStrings = await readFile(androidStringsPath, 'utf8');
  const packageName = androidStrings.match(/<string name="package_name">([^<]+)<\/string>/)?.[1];
  const customUrlScheme = androidStrings.match(/<string name="custom_url_scheme">([^<]+)<\/string>/)?.[1];

  if (packageName !== capacitorAppId) {
    throw new Error(`${androidStringsPath} package_name (${packageName ?? 'missing'}) must equal ${capacitorAppId}.`);
  }

  if (customUrlScheme !== capacitorAppId) {
    throw new Error(
      `${androidStringsPath} custom_url_scheme (${customUrlScheme ?? 'missing'}) must equal ${capacitorAppId}.`,
    );
  }
}

const iosProject = path.join('ios', 'App.xcodeproj', 'project.pbxproj');
if (existsSync(iosProject)) {
  const project = await readFile(iosProject, 'utf8');
  const nativeVersions = [...project.matchAll(/MARKETING_VERSION\s*=\s*([^;]+);/g)].map((match) => match[1].trim());
  if (nativeVersions.length === 0 || nativeVersions.some((nativeVersion) => nativeVersion !== version)) {
    throw new Error(`${iosProject} MARKETING_VERSION values must all equal ${version}.`);
  }
}

const nativeStatus = existsSync('android') || existsSync('ios') ? 'native versions checked' : 'native projects absent';
console.log(`Version consistency passed: ${version} (${nativeStatus}).`);
