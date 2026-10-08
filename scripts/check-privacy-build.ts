import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { apiKeyPatterns } from './secret-patterns';

type PackageJson = {
  dependencies?: Record<string, string>;
};

const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as PackageJson;
const runtimeDependencies = Object.keys(packageJson.dependencies ?? {});
const forbiddenDependencyPatterns = [
  /firebase/i,
  /sentry/i,
  /posthog/i,
  /mixpanel/i,
  /amplitude/i,
  /segment/i,
  /analytics/i,
  /appsflyer/i,
  /adjust/i,
  /facebook/i,
  /google.*tag/i,
];

const forbiddenRuntimeDependencies = runtimeDependencies.filter((dependency) =>
  forbiddenDependencyPatterns.some((pattern) => pattern.test(dependency)),
);

if (forbiddenRuntimeDependencies.length > 0) {
  throw new Error(`Tracking or online SDK found in runtime dependencies: ${forbiddenRuntimeDependencies.join(', ')}`);
}

const sourceFiles = (await readdir('src', { recursive: true }))
  .filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))
  .map((file) => path.join('src', file));
const networkApiPattern = /\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b|\.sendBeacon\s*\(/;
const sourceNetworkFindings: string[] = [];

for (const file of sourceFiles) {
  const content = await readFile(file, 'utf8');
  if (networkApiPattern.test(content)) sourceNetworkFindings.push(file);
}

if (sourceNetworkFindings.length > 0) {
  throw new Error(`Undocumented network API usage found: ${sourceNetworkFindings.join(', ')}`);
}

const trackerMarkers = [
  'google-analytics.com',
  'googletagmanager.com',
  'connect.facebook.net',
  'facebook.com/tr',
  'api.segment.io',
  'api.mixpanel.com',
  'app.posthog.com',
  'sentry.io',
];
const assetFiles = (await readdir('dist/assets', { recursive: true }))
  .filter((file) => /\.(js|css)$/.test(file))
  .map((file) => path.join('dist/assets', file));
const bundleTrackerFindings: string[] = [];

for (const file of assetFiles) {
  const content = (await readFile(file, 'utf8')).toLowerCase();
  const markers = trackerMarkers.filter((marker) => content.includes(marker));
  if (markers.length > 0) bundleTrackerFindings.push(`${file}: ${markers.join(', ')}`);
}

if (bundleTrackerFindings.length > 0) {
  throw new Error(`Tracker marker found in production bundle: ${bundleTrackerFindings.join('; ')}`);
}

// A key read from an environment variable at build time ends up in the
// shipped JavaScript, where anyone can read it. The key itself is never
// printed here.
const builtFiles = (await readdir('dist', { recursive: true }))
  .filter((file) => /\.(js|css|html|json|webmanifest)$/.test(file))
  .map((file) => path.join('dist', file));
const bundleKeyFindings: string[] = [];

for (const file of builtFiles) {
  const content = await readFile(file, 'utf8');
  for (const { pattern, reason } of apiKeyPatterns) {
    if (pattern.test(content)) bundleKeyFindings.push(`${file}: ${reason}`);
  }
}

if (bundleKeyFindings.length > 0) {
  throw new Error(`Credential found in production build: ${bundleKeyFindings.join('; ')}`);
}

console.log(
  `Privacy build check passed. ${runtimeDependencies.length} runtime dependencies, ${sourceFiles.length} source files, no network APIs, tracker markers or credentials.`,
);
