import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import App from './App.tsx';
import './index.css';

// Offline support for the web version only. Inside the Android app the files
// come from the APK; a service worker there could keep serving the previous
// version after an update.
if (import.meta.env.PROD && 'serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('ScrollShield root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
