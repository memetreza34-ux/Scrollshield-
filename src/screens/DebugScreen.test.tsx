import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from '../types';
import { DebugScreen } from './DebugScreen';

const { getSnapshotMock } = vi.hoisted(() => ({
  getSnapshotMock: vi.fn(),
}));

vi.mock('../lib/nativeDiagnostics', () => ({
  NativeDiagnostics: {
    isAvailable: () => true,
    getSnapshot: (...args: unknown[]) => getSnapshotMock(...args),
  },
}));

describe('DebugScreen native diagnostics', () => {
  beforeEach(() => {
    getSnapshotMock.mockReset();
    getSnapshotMock.mockResolvedValue({
      capturedAt: 1_786_000_000_000,
      manufacturer: 'Google',
      brand: 'google',
      model: 'Pixel Test',
      device: 'pixel_test',
      androidRelease: '16',
      sdkInt: 36,
      packageName: 'app.scrollshield.mobile',
      locale: 'de-DE',
      timeZone: 'Europe/Berlin',
      usageAccess: true,
      overlay: true,
      notifications: true,
      batteryOptimizationExempt: false,
      protectionEnabled: true,
      serviceRunning: true,
      configuredInstalledApps: true,
    });
  });

  it('renders the native device and protection snapshot', async () => {
    render(
      <DebugScreen
        state={{ ...DEFAULT_STATE, operatingSystem: 'android' }}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    await waitFor(() => expect(getSnapshotMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Google Pixel Test')).toBeInTheDocument();
    expect(screen.getByText('16 / SDK 36')).toBeInTheDocument();
    expect(screen.getByText('Europe/Berlin')).toBeInTheDocument();
    expect(screen.getByText('app.scrollshield.mobile')).toBeInTheDocument();
    expect(screen.getByText('NICHT AKTIV')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Diagnose als JSON kopieren' })).toBeInTheDocument();
  });
});
