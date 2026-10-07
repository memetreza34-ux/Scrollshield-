import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { expectNoA11yViolations } from './test/a11y';
import { StorageService } from './lib/storage';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from './types';

const nativeEvents = vi.hoisted(() => ({ read: vi.fn(), acknowledge: vi.fn() }));
vi.mock('./lib/nativeBridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/nativeBridge')>()),
  readInterruptionEvents: nativeEvents.read,
  acknowledgeInterruptionEvents: nativeEvents.acknowledge,
}));

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
    nativeEvents.read.mockResolvedValue([]);
    nativeEvents.acknowledge.mockResolvedValue(undefined);
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

    expect(await screen.findByRole('heading', { name: 'Welche Apps ziehen dich rein?' })).toBeInTheDocument();
    await waitFor(() => expect(scrollArea.scrollTop).toBe(0));
  });

  it('opens the help from the welcome screen instead of bouncing back', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Mehr erfahren' }));

    expect(await screen.findByRole('heading', { name: 'Hilfe & FAQ' }, { timeout: 5000 })).toBeInTheDocument();
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

    expect(await screen.findByText('Fokus läuft')).toBeInTheDocument();
    expect(screen.getByText('noch 15 Min.')).toBeInTheDocument();
  });

  /**
   * Restores a focus session one minute before its end, lets the 15 s focus
   * tick run past it and returns the titles of the notifications shown.
   */
  const runFocusSessionPastItsEnd = async (focusReminders: boolean) => {
    let now = new Date(2030, 0, 1, 12).getTime();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const shown: string[] = [];
    vi.stubGlobal(
      'Notification',
      class {
        static permission = 'granted';
        constructor(title: string) {
          shown.push(title);
        }
      },
    );
    await StorageService.saveState({
      ...DEFAULT_STATE,
      hasCompletedOnboarding: true,
      isFocusModeActive: true,
      focusTimeRemaining: 1,
      settings: {
        ...DEFAULT_STATE.settings,
        notifications: { ...DEFAULT_STATE.settings.notifications, focusReminders },
      },
      focusSessions: [
        {
          id: 'focus-ending',
          startTime: now - 24 * 60_000,
          endTime: null,
          duration: 25,
          successful: false,
          protectedApps: ['instagram'],
          blocksTriggered: 0,
        },
      ],
    });
    // Only the focus tick is captured; animation timers keep running for real.
    const focusTicks: Array<() => void> = [];
    const realSetInterval = window.setInterval.bind(window);
    vi.spyOn(window, 'setInterval').mockImplementation(((handler: TimerHandler, timeout?: number) => {
      if (timeout === 15_000) {
        focusTicks.push(handler as () => void);
        return 0;
      }
      return realSetInterval(handler, timeout);
    }) as typeof window.setInterval);

    try {
      // StrictMode runs state updaters twice, as in development.
      render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
      expect(await screen.findByText('Fokus läuft')).toBeInTheDocument();
      expect(shown).toHaveLength(0);

      now += 2 * 60_000;
      act(() => focusTicks.at(-1)?.());
      act(() => focusTicks.at(-1)?.());

      await waitFor(() => expect(screen.queryByText('Fokus läuft')).not.toBeInTheDocument());
      await act(async () => {});
      return shown;
    } finally {
      vi.unstubAllGlobals();
    }
  };

  it('notifies exactly once when a focus session runs out while the app is open', async () => {
    expect(await runFocusSessionPastItsEnd(true)).toEqual(['Fokuszeit beendet']);
  });

  it('respects a switched-off focus reminder', async () => {
    expect(await runFocusSessionPastItsEnd(false)).toEqual([]);
  });

  it('counts interruptions from the phone on the dashboard and acknowledges them', async () => {
    const now = Date.now();
    nativeEvents.read.mockResolvedValue([
      {
        id: 'n1',
        timestamp: now - 60_000,
        packageName: 'com.instagram.android',
        kind: 'app',
        outcome: 'blocked',
        reason: 'STRICT',
        swipes: 0,
      },
      {
        id: 'n2',
        timestamp: now - 30_000,
        packageName: 'com.instagram.android',
        kind: 'app',
        outcome: 'stopped',
        reason: 'STANDARD',
        swipes: 0,
      },
    ]);
    await StorageService.saveState({
      ...DEFAULT_STATE,
      hasCompletedOnboarding: true,
      appsConfig: { instagram: { ...DEFAULT_APP_CONFIG, id: 'instagram', active: true } },
    });

    render(<App />);

    // n1 locked the app, n2 was stopped: both interruptions, one not opened.
    await waitFor(
      () =>
        expect(screen.getByText('Öffnungen unterbrochen').parentElement).toHaveTextContent('2 Öffnungen unterbrochen'),
      { timeout: 5000 },
    );
    expect(screen.getByText('davon 1× nicht geöffnet')).toBeInTheDocument();
    await waitFor(() => expect(nativeEvents.acknowledge).toHaveBeenCalledWith(['n1', 'n2']));
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
        name: /Datenschutz & Daten/,
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Datenschutz & Transparenz' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /App zurücksetzen/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ja, Reset' }));

    expect(await screen.findByRole('heading', { name: 'ScrollShield' }, { timeout: 5000 })).toBeInTheDocument();
    await waitFor(() => {
      expect(Object.keys(localStorage).filter((key) => key.startsWith('scrollshield_'))).toEqual([]);
    });
  });
});
