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
      versionName: '1.0.0',
      versionCode: 1,
      locale: 'de-DE',
      timeZone: 'Europe/Berlin',
      usageAccess: true,
      overlay: true,
      appNotificationsEnabled: true,
      protectionChannelCreated: true,
      protectionChannelEnabled: false,
      notifications: false,
      batteryOptimizationExempt: false,
      protectionEnabled: true,
      serviceRunning: false,
      configuredInstalledApps: true,
      lastProtectionStartRequestAt: 1_785_998_900_000,
      lastProtectionStartAt: 1_785_999_000_000,
      lastProtectionStopAt: 1_785_999_500_000,
      lastProtectionStopCode: 'notifications_missing',
      lastProtectionStopMessage: 'Benachrichtigungen wurden entzogen; der Android-Schutz wurde beendet',
    });
  });

  it('renders build, notification, and protection lifecycle diagnostics', async () => {
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
    expect(screen.getByText('1.0.0 (Build 1)')).toBeInTheDocument();
    expect(screen.getByText('Europe/Berlin')).toBeInTheDocument();
    expect(screen.getByText('app.scrollshield.mobile')).toBeInTheDocument();
    expect(screen.getByText(/App-Benachrichtigungen/)).toBeInTheDocument();
    expect(screen.getByText(/Schutzkanal/)).toBeInTheDocument();
    expect(screen.getByText(/Schutz-Benachrichtigung/)).toBeInTheDocument();
    expect(screen.getAllByText('DEAKTIVIERT')).toHaveLength(1);
    expect(screen.getByText('NICHT BEREIT')).toBeInTheDocument();
    expect(screen.getByText(/Letzte Startanforderung/)).toBeInTheDocument();
    expect(screen.getByText(/Letzter Schutzstart/)).toBeInTheDocument();
    expect(screen.getByText(/Letzter Stoppzeitpunkt/)).toBeInTheDocument();
    expect(screen.getByText(/Letzter Stoppcode/)).toBeInTheDocument();
    expect(screen.getByText('notifications_missing')).toBeInTheDocument();
    expect(screen.getByText(/Letzter Stoppgrund/)).toBeInTheDocument();
    expect(
      screen.getByText('Benachrichtigungen wurden entzogen; der Android-Schutz wurde beendet'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Diagnose als JSON kopieren' })).toBeInTheDocument();
  });
});
