import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { generateSW } from 'workbox-build';

// vite-plugin-pwa already wrote a service worker and its workbox runtime. This
// one replaces it (it also precaches files written after Vite), so the old
// runtime would only be dead weight in the precache.
for (const file of await readdir('dist')) {
  if (file === 'sw.js' || /^workbox-[\w-]+\.js$/.test(file)) await rm(path.join('dist', file));
}

const { count, size, warnings } = await generateSW({
  swDest: 'dist/sw.js',
  globDirectory: 'dist',
  globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest}'],
  globIgnores: ['**/bundle-report.html'],
  navigateFallback: '/index.html',
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  // Source maps would ship local file paths inside the app.
  sourcemap: false,
});

for (const warning of warnings) {
  console.warn(warning);
}

console.log(`Generated service worker: ${count} precached files, ${(size / 1024).toFixed(2)} KiB.`);
