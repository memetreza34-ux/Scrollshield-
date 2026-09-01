import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_STATE } from '../types';
import { PermissionsScreen } from './PermissionsScreen';

const {
  getAndroidStatusMock,
  getProtectionStatusMock,
  isAndroidNativeMock,
  openAndroidSettingsMock,
  protectionAvailableMock,
  recoverProtectionMock,
  requestAndroidNotificationsMock,
  startProtectionMock,
} = vi.hoisted(() => ({
  getAndroidStatusMock: vi.fn(),
  getProtectionStatusMock: vi.fn(),
  isAndroidNativeMock: vi.fn(),
  openAndroidSettingsMock: vi.fn(),
  protectionAvailableMock: vi.fn(),
  recoverProtectionMock: vi.fn(),
  requestAndroidNotificationsMock: vi.fn(),
  startProtectionMock: vi.fn(),
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
    start: (...args: unknown[]) => startProtectionMock(...args),
    recoverAfterProcessLoss: (...args: unknown[]) => recoverProtectionMock(...args),
    stop: vi.fn(),
  },
}));

const androidState = {
  ...DEFAULT_STATE,
  operatingSystem: 'android' as const,
  permissions: {
    ...DEFAULT_STATE.permissions,
    usageAccess: true,
    overlay: true,
    notifications: false,
  },
  appsConfig: {
    instagram: {
      ...DEFAULT_STATE.profiles![0].appsConfig.instagram,
      active: true,
    },
  },
};

const deniedAndroidStatus = {
  usageAccess: true,
  overlay: true,
  notifications: false,
  ignoreBatteryOptimization: false,
  backgroundActivity: false,
};

const grantedAndroidStatus = {
  ...deniedAndroidStatus,
  notifications: true,
};

const processLossProtectionStatus = {
  running: false,
  enabled: true,
  unavailableAppIds: [],
  lastStartAt: 200,
  lastStopAt: 100,
  lastStopCode: 'notification_action_stop',
  lastStopMessage: 'Ein älterer sauberer Stopp',
  health: 'unclean-process-stop' as const,
};

const neverStartedProtectionStatus = {
  running: false,
  enabled: false,
  unavailableAppIds: [],
  lastStartAt: 0,
  lastStopAt: 0,
  lastStopCode: '',
  lastStopMessage: '',
  health: 'never-started' as const,
};

const activeProtectionStatus = {
  running: true,
  enabled: true,
  unavailableAppIds: [],
  lastStartAt: 300,
  lastStopAt: 100,
  lastStopCode: 'notification_action_stop',
  lastStopMessage: 'Ein älterer sauberer Stopp',
  health: 'active' as const,
};

describe('PermissionsScreen', () => {
  beforeEach(() => {
    isAndroidNativeMock.mockReset();
    protectionAvailableMock.mockReset();
    getAndroidStatusMock.mockReset();
    getProtectionStatusMock.mockReset();
    openAndroidSettingsMock.mockReset();
    recoverProtectionMock.mockReset();
    requestAndroidNotificationsMock.mockReset();
    startProtectionMock.mockReset();

    isAndroidNativeMock.mockReturnValue(false);
    protectionAvailableMock.mockReturnValue(false);
    getAndroidStatusMock.mockResolvedValue(null);
    getProtectionStatusMock.mockResolvedValue(neverStartedProtectionStatus);
    recoverProtectionMock.mockResolvedValue(activeProtectionStatus);
    requestAndroidNotificationsMock.mockResolvedValue(false);
    openAndroidSettingsMock.mockResolvedValue(undefined);
  });

  it('labels permission actions with their context for screen readers', async () => {
    const { container } = render(
      <PermissionsScreen state={DEFAULT_STATE} updateState={vi.fn()} navigate={vi.fn()} isOnboarding />,
    );

    expect(screen.getByRole('button', { name: 'Aktivieren: Benachrichtigungen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Später: Benachrichtigungen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mehr erfahren: Bildschirmzeit-Zugriff (iPhone/iPad)' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByText(/Die übrigen Schutzregeln bleiben erhalten/)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/Managed Settings|Shielding|asynchron/);
    await expectNoA11yViolations(container);
  });

  it('allows onboarding to finish without granting optional or required permissions', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();

    render(<PermissionsScreen state={DEFAULT_STATE} updateState={updateState} navigate={navigate} isOnboarding />);

    fireEvent.click(screen.getByRole('button', { name: 'Schutzschirm ist bereit' }));

    expect(updateState).toHaveBeenCalledWith({ hasCompletedOnboarding: true });
    expect(updateState).not.toHaveBeenCalledWith(expect.objectContaining({ permissions: expect.anything() }));
    expect(navigate).toHaveBeenCalledWith('dashboard');
  });

  it('keeps a skipped permission disabled', () => {
    const updateState = vi.fn();

    render(<PermissionsScreen state={DEFAULT_STATE} updateState={updateState} navigate={vi.fn()} isOnboarding />);
    fireEvent.click(screen.getByRole('button', { name: 'Später: Benachrichtigungen' }));

    expect(updateState).toHaveBeenCalledWith({
      permissions: { ...DEFAULT_STATE.permissions, notifications: false },
    });
  });

  it('marks notifications as required and blocks Android protection without them', async () => {
    isAndroidNativeMock.mockReturnValue(true);
    protectionAvailableMock.mockReturnValue(true);
    getAndroidStatusMock.mockResolvedValue(deniedAndroidStatus);

    render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} />);

    const notificationSection = screen.getByRole('heading', { name: 'Benachrichtigungen' }).closest('section');
    expect(notificationSection).not.toBeNull();
    expect(within(notificationSection!).getByText('FEHLT')).toBeInTheDocument();
    expect(within(notificationSection!).queryByText('OPTIONAL')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Schutzdienst starten' }));

    await waitFor(() => {
      expect(screen.getByText(/Start blockiert: Benachrichtigungsfreigabe fehlt/)).toBeInTheDocument();
    });
    expect(startProtectionMock).not.toHaveBeenCalled();
    expect(recoverProtectionMock).not.toHaveBeenCalled();
  });

  it('shows stale activation, exact stop code, and stop message from Android', async () => {
    isAndroidNativeMock.mockReturnValue(true);
    protectionAvailableMock.mockReturnValue(true);
    getAndroidStatusMock.mockResolvedValue(grantedAndroidStatus);
    getProtectionStatusMock.mockResolvedValue({
      running: false,
      enabled: true,
      unavailableAppIds: [],
      lastStartAt: 1_786_000_000_000,
      lastStopAt: 1_786_000_100_000,
      lastStopCode: 'notifications_missing',
      lastStopMessage: 'Benachrichtigungen wurden entzogen',
      health: 'stale-activation',
    });

    render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(await screen.findByText('NEUSTART NÖTIG')).toBeInTheDocument();
    expect(screen.getByText('Schutz ist gespeichert, aber der Dienst läuft nicht')).toBeInTheDocument();
    expect(screen.getByText('notifications_missing')).toBeInTheDocument();
    expect(screen.getByText('Benachrichtigungen wurden entzogen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schutzdienst starten' })).toBeInTheDocument();
  });

  it('uses controlled recovery instead of the normal start path after process loss', async () => {
    isAndroidNativeMock.mockReturnValue(true);
    protectionAvailableMock.mockReturnValue(true);
    getAndroidStatusMock.mockResolvedValue(grantedAndroidStatus);
    getProtectionStatusMock.mockResolvedValue(processLossProtectionStatus);
    recoverProtectionMock.mockResolvedValue(activeProtectionStatus);

    render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} />);

    const recoveryButton = await screen.findByRole('button', { name: 'Schutz wiederherstellen' });
    fireEvent.click(recoveryButton);

    await waitFor(() => {
      expect(recoverProtectionMock).toHaveBeenCalledWith(androidState.appsConfig, androidState.isFocusModeActive);
    });
    expect(startProtectionMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/nach dem Prozessabbruch.*wiederhergestellt/)).toBeInTheDocument();
  });

  it('names the exact missing permission before process-loss recovery starts', async () => {
    isAndroidNativeMock.mockReturnValue(true);
    protectionAvailableMock.mockReturnValue(true);
    getProtectionStatusMock.mockResolvedValue(processLossProtectionStatus);
    getAndroidStatusMock.mockResolvedValue({
      ...grantedAndroidStatus,
      usageAccess: false,
      overlay: true,
      notifications: true,
    });

    render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Schutz wiederherstellen' }));

    expect(await screen.findByText(/Wiederherstellung blockiert: App-Nutzungszugriff fehlt/)).toBeInTheDocument();
    expect(recoverProtectionMock).not.toHaveBeenCalled();
    expect(startProtectionMock).not.toHaveBeenCalled();
  });

  it('rechecks Android permissions after a recovery error to diagnose a permission race', async () => {
    isAndroidNativeMock.mockReturnValue(true);
    protectionAvailableMock.mockReturnValue(true);
    getProtectionStatusMock.mockResolvedValue(processLossProtectionStatus);
    getAndroidStatusMock
      .mockResolvedValueOnce(grantedAndroidStatus)
      .mockResolvedValueOnce(grantedAndroidStatus)
      .mockResolvedValueOnce({
        ...grantedAndroidStatus,
        overlay: false,
      });
    recoverProtectionMock.mockRejectedValue(new Error('native recovery failed'));

    render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Schutz wiederherstellen' }));

    expect(await screen.findByText(/Wiederherstellung blockiert: Hinweis über anderen Apps fehlt/)).toBeInTheDocument();
    expect(recoverProtectionMock).toHaveBeenCalledTimes(1);
    expect(startProtectionMock).not.toHaveBeenCalled();
  });

  it('maps a fresh native prerequisite stop code to an exact recovery blocker', async () => {
    isAndroidNativeMock.mockReturnValue(true);
    protectionAvailableMock.mockReturnValue(true);
    getAndroidStatusMock.mockResolvedValue(grantedAndroidStatus);
    getProtectionStatusMock.mockResolvedValue(processLossProtectionStatus);
    recoverProtectionMock.mockResolvedValue({
      running: false,
      enabled: false,
      unavailableAppIds: [],
      lastStartAt: 300,
      lastStopAt: 301,
      lastStopCode: 'notifications_missing',
      lastStopMessage: 'Benachrichtigungen wurden entzogen',
      health: 'stopped-with-reason' as const,
    });

    render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Schutz wiederherstellen' }));

    expect(await screen.findByText(/Wiederherstellung blockiert: Benachrichtigungsfreigabe fehlt/)).toBeInTheDocument();
    expect(recoverProtectionMock).toHaveBeenCalledTimes(1);
  });

  it('uses the native Android notification prompt before opening settings', async () => {
    isAndroidNativeMock.mockReturnValue(true);
    protectionAvailableMock.mockReturnValue(true);
    requestAndroidNotificationsMock.mockResolvedValue(true);
    getAndroidStatusMock.mockResolvedValueOnce(deniedAndroidStatus).mockResolvedValue(grantedAndroidStatus);

    const updateState = vi.fn();
    render(<PermissionsScreen state={androidState} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Benachrichtigungen erlauben: Benachrichtigungen',
      }),
    );

    await waitFor(() => expect(requestAndroidNotificationsMock).toHaveBeenCalledTimes(1));
    expect(openAndroidSettingsMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/sichtbare Stop-Aktion sind aktiviert/)).toBeInTheDocument();
    expect(updateState).toHaveBeenCalledWith({
      permissions: expect.objectContaining({ notifications: true }),
    });
  });

  it('opens Android settings after the notification prompt is denied', async () => {
    isAndroidNativeMock.mockReturnValue(true);
    protectionAvailableMock.mockReturnValue(true);
    requestAndroidNotificationsMock.mockResolvedValue(false);
    getAndroidStatusMock.mockResolvedValue(deniedAndroidStatus);

    render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Benachrichtigungen erlauben: Benachrichtigungen',
      }),
    );

    await waitFor(() => expect(openAndroidSettingsMock).toHaveBeenCalledWith('notifications'));
    expect(await screen.findByText(/Schutzkanal ist deaktiviert/)).toBeInTheDocument();
  });
});
