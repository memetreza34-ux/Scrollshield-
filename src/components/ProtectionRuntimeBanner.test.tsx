import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { ProtectionRuntimeBanner } from './ProtectionRuntimeBanner';

const { statusMock } = vi.hoisted(() => ({ statusMock: vi.fn() }));

vi.mock('../lib/nativeProtection', () => ({
  NativeProtection: {
    isAvailable: () => true,
    getStatus: (...args: unknown[]) => statusMock(...args),
  },
}));

const state = {
  ...DEFAULT_STATE,
  operatingSystem: 'android' as const,
  appsConfig: {
    ...DEFAULT_STATE.appsConfig,
    instagram: { id: 'instagram', ...DEFAULT_APP_CONFIG, active: true, updatedAt: 123 },
  },
};

const status = (enabled: boolean, running: boolean, lastStopMessage = '') => ({
  enabled,
  running,
  unavailableAppIds: [],
  lastStartAt: 1,
  lastStopAt: lastStopMessage ? 2 : 0,
  lastStopCode: lastStopMessage ? 'manual_app_stop' : '',
  lastStopMessage,
  health: running && enabled ? 'active' : enabled ? 'stale-activation' : 'stopped-with-reason',
});

describe('ProtectionRuntimeBanner', () => {
  beforeEach(() => statusMock.mockReset());

  it('shows running only when the native service and activation are both active', async () => {
    statusMock.mockResolvedValue(status(true, true));
    render(<ProtectionRuntimeBanner state={state} navigate={vi.fn()} />);

    expect(await screen.findByText('Android-Schutz läuft')).toBeInTheDocument();
    expect(screen.getByText(/1 App konfiguriert/)).toBeInTheDocument();
  });

  it('shows a stopped warning even though app rules remain configured', async () => {
    statusMock.mockResolvedValue(status(false, false, 'Der Android-Schutz wurde manuell gestoppt'));
    render(<ProtectionRuntimeBanner state={state} navigate={vi.fn()} />);

    expect(await screen.findByText('Android-Schutz ist gestoppt')).toBeInTheDocument();
    expect(screen.getByText(/Regeln sind gespeichert, aber sie werden nicht/)).toBeInTheDocument();
    expect(screen.getByText(/Letzter Stopp: Der Android-Schutz wurde manuell gestoppt/)).toBeInTheDocument();
  });

  it('distinguishes stale stored activation from an intentionally disabled service', async () => {
    statusMock.mockResolvedValue(status(true, false));
    render(<ProtectionRuntimeBanner state={state} navigate={vi.fn()} />);

    expect(await screen.findByText('Android-Schutz ist nicht laufend')).toBeInTheDocument();
    expect(screen.getByText(/sichere Wiederherstellung/)).toBeInTheDocument();
  });

  it('refreshes native status when the app becomes visible again', async () => {
    statusMock.mockResolvedValue(status(true, true));
    render(<ProtectionRuntimeBanner state={state} navigate={vi.fn()} />);
    await screen.findByText('Android-Schutz läuft');

    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(statusMock.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});
