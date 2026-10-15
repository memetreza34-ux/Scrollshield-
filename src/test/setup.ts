import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// The app follows the phone's language. The tests are written against the
// German texts, so the test "phone" speaks German; English has its own tests.
Object.defineProperty(window.navigator, 'language', { value: 'de-DE', configurable: true });

afterEach(() => {
  cleanup();
});
