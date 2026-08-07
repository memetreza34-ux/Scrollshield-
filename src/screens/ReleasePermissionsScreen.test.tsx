import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from '../types';
import { ReleasePermissionsScreen } from './ReleasePermissionsScreen';

const {
  getAndroidStatusMock,
  getProtectionStatusMock,
  isAndroidNativeMock,
  openAndroidSettingsMock,
  protectionAvailableMock,
  requestAndroidNotificationsMock,
  startProtectionMock,
  stopProtectionMock,
  syncProtectionMock,
} = vi.hoisted(() => ({
  getAndroidStatusMock: vi.fn(),
  getProtectionStatusMock: vi.fn(),
  isAndroidNativeMock: vi.fn(),
  openAndroidSettingsMock: vi.fn(),
  protectionAvailableMock: vi.fn(),
  requestAndroidNotificationsMock: vi.fn(),
  startProtectionMock: vi.fn(),
  stopProtectionMock: vi.fn(),
  syncProtectionMock: vi.fn(),
}));

vi.mock('../lib/nativePermissions', () => ({
  NativePermissions: {
    isAndroidNative: () => isAndroidNativeMock(),
    getAndroidStatus: () => getAndroidStatusMock(),
    requestAndroidNotifications: () => requestAndroidNotificationsMock(),
    openAndroidSettings: (...args: unknown[]) => openAndroidSettingsMock(...args),
  },
}));

vi.mock('../lib/nativeProtection', () => ({
  NativeProtection: {
    isAvailable: () => protectionAvailableMock(),
    getStatus: () => getProtectionStatusMock(),
    sync: (...args: unknown[]) => syncProtectionMock(...args),
    start: (...args: unknown[]) => startProtectionMock(...args),
    stop: (...args: unknown[]) => stopProtectionMock(...args),
  },
}));

const stoppedStatus = {
  running: false,
  enabled: false,
  unavailableAppIds: [],
  lastStartAt: 0,
  lastStopAt: 0,
  lastStopCode: '',
  lastStopMessage: '',
  health: 'never-started' as const,
};

const activeStatus = {
  ...stoppedStatus,
  running: true,
  enabled: true,
  lastStartAt: 1_786_000_000_000,
  health: 'active' as const,
};

const readyAndroidState = {
  ...DEFAULT_STATE,
  operatingSystem: 'android' as const,
  permissions: {
    ...DEFAULT_STATE.permissions,
    usageAccess: true,
    overlay: true,
    notifications: true,
  },
  appsConfig: {
    ...DEFAULT_STATE.appsConfig,
    instagram: {
      ...DEFAULT_STATE.appsConfig.instagram,
      active: true,
    },
  },
};

describe('ReleasePermissionsScreen', () => {
  beforeEach(() => {
    isAndroidNativeMock.mockReset();
    protectionAvailableMock.mockReset();
    getAndroidStatusMock.mockReset();
    getProtectionStatusMock.mockReset();
    openAndroidSettingsMock.mockReset();
    requestAndroidNotificationsMock.mockReset();
    startProtectionMock.mockReset();
    stopProtectionMock.mockReset();
    syncProtectionMock.mockReset();

    isAndroidNativeMock.mockReturnValue(true);
    protectionAvailableMock.mockReturnValue(true);
    getAndroidStatusMock.mockResolvedValue({
      usageAccess: true,
      overlay: true,
      notifications: true,
      ignoreBatteryOptimization: false,
      backgroundActivity: false,
    });
    getProtectionStatusMock.mockResolvedValue(stoppedStatus);
    openAndroidSettingsMock.mockResolvedValue(undefined);
    requestAndroidNotificationsMock.mockResolvedValue(true);
    syncProtectionMock.mockResolvedValue([]);
    startProtectionMock.mockResolvedValue(undefined);
    stopProtectionMock.mockResolvedValue(undefined);
  });

  it('never claims onboarding protection is ready when required setup is missing', () => {
    const state = {
      ...DEFAULT_STATE,
      operatingSystem: 'android' as const,
    };
    isAndroidNativeMock.mockReturnValue(false);

    render(<ReleasePermissionsScreen state={state} updateState={vi.fn()} navigate={vi.fn()} isOnboarding />);

    expect(screen.getByRole('button', { name: 'Setup später abschließen' })).toBeInTheDocument();
    expect(screen.getByText(/behauptet bis dahin nicht, dass der Android-Schutz aktiv ist/)).toBeInTheDocument();
    expect(screen.queryByText('Schutzschirm ist bereit')).not.toBeInTheDocument();
  });

  it('does not expose fake reminder or schedule promises', () => {
    render(<ReleasePermissionsScreen state={readyAndroidState} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText(/sichtbare Stop-Aktion/)).toBeInTheDocument();
    expect(screen.queryByText(/Fokus-Erinnerungen/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tageszusammenfassung/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Zeitpläne und aktive Sitzungen/)).not.toBeInTheDocument();
  });

  it('blocks service start when every selected active app is unavailable', async () => {
    syncProtectionMock.mockResolvedValue(['instagram']);

    render(<ReleasePermissionsScreen state={readyAndroidState} updateState={vi.fn()} navigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Schutzdienst starten' }));

    expect(await screen.findByText(/Keine ausgewählte aktive App ist auf diesem Android-Gerät verfügbar/)).toBeInTheDocument();
    expect(startProtectionMock).not.toHaveBeenCalled();
  });

  it('starts only after native permissions and an installed active target are verified', async () => {
    getProtectionStatusMock.mockResolvedValueOnce(stoppedStatus).mockResolvedValue(activeStatus);

    render(<ReleasePermissionsScreen state={readyAndroidState} updateState={vi.fn()} navigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Schutzdienst starten' }));

    await waitFor(() => expect(syncProtectionMock).toHaveBeenCalled());
    await waitFor(() => expect(startProtectionMock).toHaveBeenCalled());
    expect(await screen.findByText(/Android-Schutz läuft für 1 verfügbare App/)).toBeInTheDocument();
  });

  it('shows iOS as unreleased instead of simulating system permission toggles', () => {
    isAndroidNativeMock.mockReturnValue(false);
    const iosState = { ...DEFAULT_STATE, operatingSystem: 'ios' as const };

    render(<ReleasePermissionsScreen state={iosState} updateState={vi.fn()} navigate={vi.fn()} isOnboarding />);

    expect(screen.getByRole('heading', { name: 'iOS-Schutz noch nicht freigegeben' })).toBeInTheDocument();
    expect(screen.getByText(/keine künstlichen Berechtigungsschalter/)).toBeInTheDocument();
  });
});
