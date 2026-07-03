import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');

const readDistFile = (file: string) => readFile(path.join(distDir, file), 'utf8');

const [manifestRaw, swRaw, htmlRaw] = await Promise.all([
  readDistFile('manifest.webmanifest'),
  readDistFile('sw.js'),
  readDistFile('index.html'),
]);
const privacyHtmlRaw = await readDistFile('privacy.html');

const manifest = JSON.parse(manifestRaw) as {
  name?: string;
  display?: string;
  icons?: Array<{ src?: string; sizes?: string; purpose?: string }>;
};

const requiredIcons = ['/pwa-192.png', '/pwa-512.png', '/maskable-512.png'];
const missingIcons = requiredIcons.filter((icon) => !manifest.icons?.some((entry) => entry.src === icon));
const assertDistFileExists = async (file: string) => access(path.join(distDir, file.replace(/^\//, '')));

if (manifest.name !== 'ScrollShield') {
  throw new Error('PWA manifest name is missing or incorrect.');
}

if (manifest.display !== 'standalone') {
  throw new Error('PWA manifest display mode must be standalone.');
}

if (missingIcons.length > 0) {
  throw new Error(`PWA manifest misses required icons: ${missingIcons.join(', ')}`);
}

await Promise.all(requiredIcons.map(assertDistFileExists));

if (swRaw.includes('bundle-report.html')) {
  throw new Error('Service worker must not precache bundle-report.html.');
}

const precachedUrls = Array.from(swRaw.matchAll(/url:"([^"]+)"/g), (match) => match[1]);
const duplicateUrls = precachedUrls.filter((url, index) => precachedUrls.indexOf(url) !== index);

if (duplicateUrls.length > 0) {
  throw new Error(`Service worker precaches duplicate URLs: ${Array.from(new Set(duplicateUrls)).join(', ')}`);
}

const builtAssets = (await readdir(path.join(distDir, 'assets')))
  .filter((file) => /\.(?:js|css)$/.test(file))
  .map((file) => `assets/${file}`);
const requiredPrecachedFiles = [
  'index.html',
  'manifest.webmanifest',
  'registerSW.js',
  'privacy.html',
  ...requiredIcons.map((icon) => icon.replace(/^\//, '')),
  ...builtAssets,
];
const missingPrecachedFiles = requiredPrecachedFiles.filter((file) => !precachedUrls.includes(file));

if (missingPrecachedFiles.length > 0) {
  throw new Error(`Offline precache misses required files: ${missingPrecachedFiles.join(', ')}`);
}

if (!/createHandlerBoundToURL\(["']\/index\.html["']\)/.test(swRaw)) {
  throw new Error('Service worker must use index.html as its offline navigation fallback.');
}

if (!htmlRaw.includes('Content-Security-Policy')) {
  throw new Error('Production index.html must include a Content-Security-Policy meta tag.');
}

if (!privacyHtmlRaw.includes('Datenschutzerklärung') || !privacyHtmlRaw.includes('Offline-First')) {
  throw new Error('Production build must include the public privacy.html page.');
}

console.log('PWA build checks passed.');
