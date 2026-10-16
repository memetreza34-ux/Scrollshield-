import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'path';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

const productionCsp =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; manifest-src 'self'; worker-src 'self'";

export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    mode !== 'development' && {
      name: 'scrollshield-security-meta',
      transformIndexHtml(html) {
        return html.replace(
          '<meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), payment=()" />',
          `<meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), payment=()" />\n    <meta http-equiv="Content-Security-Policy" content="${productionCsp}" />`,
        );
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      // Registered in src/main.tsx, and only in the browser: inside the Android
      // app the files come from the APK, and a service worker there could keep
      // serving the previous version after an update.
      injectRegister: false,
      manifest: {
        name: 'ScrollShield',
        short_name: 'ScrollShield',
        description: 'Bewusster App- und Kurzvideo-Schutz gegen impulsives Scrollen.',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'de',
        categories: ['productivity', 'health', 'utilities'],
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Source maps would ship local file paths inside the app.
        sourcemap: false,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest}'],
        globIgnores: ['**/bundle-report.html'],
      },
    }),
    mode === 'analyze' &&
      visualizer({
        filename: 'dist/bundle-report.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom')) return 'react-dom';
          if (id.includes('react')) return 'react';
          if (id.includes('motion')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Agent worktrees under .claude/ hold full copies of the repository.
    exclude: [...configDefaults.exclude, '.claude/**'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.{ts,tsx}'],
      exclude: ['dist/**', 'node_modules/**', 'src/vite-env.d.ts'],
    },
  },
}));
