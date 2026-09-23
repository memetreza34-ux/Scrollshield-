import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { AppState, DEFAULT_STATE } from '../types';
import { PermissionsScreen } from './PermissionsScreen';

const getPermissionStatus = vi.hoisted(() => vi.fn());
vi.mock('../lib/nativeBridge', () => ({ ScrollShieldBridge: { getPermissionStatus } }));

afterEach(() => {
  vi.restoreAllMocks();
  getPermissionStatus.mockReset();
});

// Platform-specific cards only render for their platform, so the state has to
// name one explicitly. DEFAULT_STATE is 'web', where neither Screen Time nor
// Usage Access exists.
const iosState = { ...DEFAULT_STATE, operatingSystem: 'ios' as const };
const androidState = { ...DEFAULT_STATE, operatingSystem: 'android' as const };

describe('PermissionsScreen', () => {
  it('labels permission actions with their context for screen readers', async () => {
    const { container } = render(
      <PermissionsScreen state={iosState} updateState={vi.fn()} navigate={vi.fn()} isOnboarding />,
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

  it('does not offer system permissions in the browser', () => {
    render(<PermissionsScreen state={DEFAULT_STATE} updateState={vi.fn()} navigate={vi.fn()} isOnboarding />);

    expect(screen.getByRole('heading', { name: 'Du nutzt die Webversion' })).toBeInTheDocument();
    expect(screen.queryByText('Bildschirmzeit-Zugriff (iPhone/iPad)')).not.toBeInTheDocument();
    expect(screen.queryByText('App-Nutzungszugriff')).not.toBeInTheDocument();
  });

  it('offers the Android permissions including short-video detection on Android', () => {
    render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} isOnboarding />);

    expect(screen.getByText('App-Nutzungszugriff')).toBeInTheDocument();
    expect(screen.getByText('Kurzvideo-Erkennung (Bedienungshilfe)')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Du nutzt die Webversion' })).not.toBeInTheDocument();
  });

  it('merges the system status into the latest state instead of the first render', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    getPermissionStatus.mockResolvedValue({
      usageStats: true,
      overlay: false,
      notifications: true,
      monitoringActive: false,
      accessibility: true,
    });
    const updateState = vi.fn();

    render(<PermissionsScreen state={androidState} updateState={updateState} navigate={vi.fn()} />);
    await waitFor(() => expect(updateState).toHaveBeenCalled());

    // A switch the user set after this screen rendered must survive.
    const latest: AppState = {
      ...androidState,
      permissions: { ...androidState.permissions, backgroundActivity: true },
    };
    const updater = updateState.mock.calls[0][0] as (previous: AppState) => Partial<AppState>;
    expect(updater(latest).permissions).toEqual({
      ...latest.permissions,
      usageAccess: true,
      overlay: false,
      notifications: true,
      accessibility: true,
    });
  });

  it('keeps the browser demo switches instead of applying the web fallback', async () => {
    const updateState = vi.fn();

    render(<PermissionsScreen state={DEFAULT_STATE} updateState={updateState} navigate={vi.fn()} />);
    await Promise.resolve();

    expect(getPermissionStatus).not.toHaveBeenCalled();
    expect(updateState).not.toHaveBeenCalled();
  });
});
