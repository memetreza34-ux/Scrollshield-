import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { expectNoA11yViolations } from './test/a11y';
import { StorageService } from './lib/storage';
import { DEFAULT_STATE } from './types';

// ── Web Crypto stub (same as storage.test.ts) ─────────────────────────────────
const cryptoSubtleStub = {
  generateKey: vi.fn().mockResolvedValue({} as CryptoKey),
  exportKey: vi.fn().mockResolvedValue(new Uint8Array(32).buffer),
  importKey: vi.fn().mockResolvedValue({} as CryptoKey),
  encrypt: vi.fn().mockImplementation(async (_a: unknown, _k: unknown, data: BufferSource) => {
    const src =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(
            (data as ArrayBufferView).buffer,
            (data as ArrayBufferView).byteOffset,
            (data as ArrayBufferView).byteLength,
          );
    const out = new Uint8Array(12 + src.byteLength);
    out.set(src, 12);
    return out.buffer;
  }),
  decrypt: vi.fn().mockImplementation(async (_a: unknown, _k: unknown, data: BufferSource) => {
    const src =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(
            (data as ArrayBufferView).buffer,
            (data as ArrayBufferView).byteOffset,
            (data as ArrayBufferView).byteLength,
          );
    return src.slice(12).buffer;
  }),
};

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('crypto', {
      getRandomValues: (arr: Uint8Array) => arr.fill(0),
      subtle: cryptoSubtleStub,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts on the welcome screen without saved state', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'ScrollShield' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Loslegen' })).toBeInTheDocument();
  });

  it('returns the shared scroll area to the top when changing screens', async () => {
    render(<App />);
    const scrollArea = await screen.findByTestId('screen-scroll');
    scrollArea.scrollTop = 300;

    fireEvent.click(screen.getByRole('button', { name: 'Loslegen' }));

    expect(await screen.findByRole('heading', { name: 'Ziele auswaehlen' })).toBeInTheDocument();
    await waitFor(() => expect(scrollArea.scrollTop).toBe(0));
  });

  it('has no obvious accessibility violations on the welcome screen', async () => {
    const { container } = render(<App />);

    expect(await screen.findByRole('heading', { name: 'ScrollShield' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('restores a running focus session from its start timestamp', async () => {
    const now = new Date(2030, 0, 1, 12).getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    await StorageService.saveState({
      ...DEFAULT_STATE,
      hasCompletedOnboarding: true,
      isFocusModeActive: true,
      focusTimeRemaining: 25,
      focusSessions: [
        {
          id: 'focus-restart',
          startTime: now - 10 * 60_000,
          endTime: null,
          duration: 25,
          successful: false,
          protectedApps: ['instagram'],
          blocksTriggered: 0,
        },
      ],
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Fokusmodus Aktiv' })).toBeInTheDocument();
    expect(screen.getByLabelText('Noch 15 Minuten')).toBeInTheDocument();
  });

  it('clears persisted data and returns to onboarding after a confirmed reset', async () => {
    await StorageService.saveState({
      ...DEFAULT_STATE,
      hasCompletedOnboarding: true,
      stats: { ...DEFAULT_STATE.stats, totalSavedTime: 120 },
    });

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Einstellungen' }));
    expect(await screen.findByRole('heading', { name: 'Einstellungen' }, { timeout: 5000 })).toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Datenschutz & Transparenz Lokale Daten, Berechtigungen & App-Reset',
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Datenschutz & Transparenz' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /App zurücksetzen/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ja, Reset' }));

    expect(await screen.findByRole('heading', { name: 'ScrollShield' })).toBeInTheDocument();
    await waitFor(() => {
      expect(Object.keys(localStorage).filter((key) => key.startsWith('scrollshield_'))).toEqual([]);
    });
  });
});
