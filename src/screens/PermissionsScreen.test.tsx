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
  requestAndroidNotificationsMock,
  startProtectionMock,
} = vi.hoisted(() => ({
  getAndroidStatusMock: vi.fn(),
  getProtectionStatusMock: vi.fn(),
  isAndroidNativeMock: vi.fn(),
  openAndroidSettingsMock: vi.fn(),
  protectionAvailableMock: vi.fn(),
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

describe('PermissionsScreen', () => {
  beforeEach(() => {
    isAndroidNativeMock.mockReset();
    protectionAvailableMock.mockReset();
    getAndroidStatusMock.mockReset();
    getProtectionStatusMock.mockReset();
    openAndroidSettingsMock.mockReset();
    requestAndroidNotificationsMock.mockReset();
    startProtectionMock.mockReset();

    isAndroidNativeMock.mockReturnValue(false);
    protectionAvailableMock.mockReturnValue(false);
    getAndroidStatusMock.mockResolvedValue(null);
    getProtectionStatusMock.mockResolvedValue({ running: false });
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

    fireEvent.click(screen.getByRole('button', { name: 'Schutzdienst starten' }));

    await waitFor(() => {
      expect(screen.getByText(/Aktiviere zuerst App-Nutzungszugriff/)).toBeInTheDocument();
    });
    expect(startProtectionMock).not.toHaveBeenCalled();
  });

  it('uses the native Android notification prompt before opening settings', async () => {
    isAndroidNativeMock.mockReturnValue(true);
    protectionAvailableMock.mockReturnValue(true);
    requestAndroidNotificationsMock.mockResolvedValue(true);
    getAndroidStatusMock
      .mockResolvedValueOnce(deniedAndroidStatus)
      .mockResolvedValue(grantedAndroidStatus);

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
