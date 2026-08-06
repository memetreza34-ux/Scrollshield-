import { generateSW } from 'workbox-build';

const { count, size, warnings } = await generateSW({
  swDest: 'dist/sw.js',
  globDirectory: 'dist',
  globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest}'],
  globIgnores: ['**/bundle-report.html'],
  navigateFallback: '/index.html',
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
});

for (const warning of warnings) {
  console.warn(warning);
}

console.log(`Generated service worker: ${count} precached files, ${(size / 1024).toFixed(2)} KiB.`);
