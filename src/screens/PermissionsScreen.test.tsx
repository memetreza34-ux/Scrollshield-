import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { AppState, DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { PermissionsScreen } from './PermissionsScreen';

const { getPermissionStatus, openAccessibilitySettings, openBatteryOptimizationSettings, startMonitoring } = vi.hoisted(
  () => ({
    getPermissionStatus: vi.fn(),
    openAccessibilitySettings: vi.fn(),
    openBatteryOptimizationSettings: vi.fn(),
    startMonitoring: vi.fn(),
  }),
);
vi.mock('../lib/nativeBridge', () => ({
  ScrollShieldBridge: {
    getPermissionStatus,
    openAccessibilitySettings,
    openBatteryOptimizationSettings,
    startMonitoring,
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  getPermissionStatus.mockReset();
  openAccessibilitySettings.mockReset();
  openBatteryOptimizationSettings.mockReset();
  startMonitoring.mockReset();
});

const androidState: AppState = {
  ...DEFAULT_STATE,
  operatingSystem: 'android',
  appsConfig: { instagram: { ...DEFAULT_APP_CONFIG, id: 'instagram', active: true } },
};

const nativeStatus = (overrides: Record<string, boolean> = {}) => ({
  usageStats: true,
  overlay: true,
  notifications: false,
  monitoringActive: true,
  accessibility: false,
  batteryOptimizationIgnored: true,
  ...overrides,
});

describe('PermissionsScreen', () => {
  it('only offers notifications in the browser and says why', async () => {
    const { container } = render(<PermissionsScreen state={DEFAULT_STATE} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText('Vorschau im Browser')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Erlauben: Benachrichtigungen' })).toBeInTheDocument();
    expect(screen.queryByText('App-Nutzungszugriff')).not.toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('lists the Android permissions with what each one is for', () => {
    render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText('App-Nutzungszugriff')).toBeInTheDocument();
    expect(screen.getByText('Bedienungshilfe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Einschalten: Bedienungshilfe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Erkennung prüfen' })).toBeInTheDocument();
  });

  it('merges the system status into the latest state instead of the first render', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    getPermissionStatus.mockResolvedValue(nativeStatus({ overlay: false, notifications: true, accessibility: true }));
    const updateState = vi.fn();

    render(<PermissionsScreen state={androidState} updateState={updateState} navigate={vi.fn()} />);
    await waitFor(() => expect(updateState).toHaveBeenCalled());

    // A switch the user set after this screen rendered must survive.
    const latest: AppState = { ...androidState, permissions: { ...androidState.permissions, screenTime: true } };
    const updater = updateState.mock.calls[0][0] as (previous: AppState) => Partial<AppState>;
    expect(updater(latest).permissions).toEqual({
      ...latest.permissions,
      usageAccess: true,
      overlay: false,
      notifications: true,
      accessibility: true,
      backgroundActivity: true,
      ignoreBatteryOptimization: true,
    });
  });

  it('shows a running service', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    getPermissionStatus.mockResolvedValue(nativeStatus());

    render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(await screen.findByText('Schutz-Dienst läuft')).toBeInTheDocument();
  });

  it('offers a restart when Android stopped the service', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    getPermissionStatus.mockResolvedValue(nativeStatus({ monitoringActive: false }));
    startMonitoring.mockResolvedValue({ started: true, overlayGranted: true });

    render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Neu starten' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Schutz-Dienst gestoppt');
    await waitFor(() => expect(startMonitoring).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getPermissionStatus).toHaveBeenCalledTimes(2));
  });

  it('shows the accessibility disclosure and opens the settings only after consent', async () => {
    openAccessibilitySettings.mockResolvedValue({ opened: true });
    const { container } = render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Einschalten: Bedienungshilfe' }));

    expect(screen.getByRole('dialog', { name: 'Bedienungshilfe für den Kurzvideo-Schutz' })).toBeInTheDocument();
    expect(openAccessibilitySettings).not.toHaveBeenCalled();
    await expectNoA11yViolations(container);

    fireEvent.click(screen.getByRole('button', { name: 'Zustimmen und einschalten' }));

    expect(openAccessibilitySettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open the accessibility settings when the disclosure is declined', () => {
    render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Einschalten: Bedienungshilfe' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nicht jetzt' }));

    expect(openAccessibilitySettings).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the battery settings instead of flipping a local switch', async () => {
    openBatteryOptimizationSettings.mockResolvedValue({ opened: true });
    const updateState = vi.fn();

    render(<PermissionsScreen state={androidState} updateState={updateState} navigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Erlauben: Akku-Ausnahme' }));
    await Promise.resolve();

    expect(openBatteryOptimizationSettings).toHaveBeenCalledTimes(1);
    // Granted only when Android reports the exemption on return.
    expect(updateState).not.toHaveBeenCalled();
  });

  it('keeps the browser demo switches instead of applying the web fallback', async () => {
    const updateState = vi.fn();

    render(<PermissionsScreen state={DEFAULT_STATE} updateState={updateState} navigate={vi.fn()} />);
    await Promise.resolve();

    expect(getPermissionStatus).not.toHaveBeenCalled();
    expect(updateState).not.toHaveBeenCalled();
  });
});
