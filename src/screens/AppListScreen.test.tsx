import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { AppList } from './AppListScreen';

const { syncMock } = vi.hoisted(() => ({
  syncMock: vi.fn(),
}));

vi.mock('../lib/nativeProtection', () => ({
  NativeProtection: {
    isAvailable: () => true,
    sync: (...args: unknown[]) => syncMock(...args),
  },
}));

describe('AppList', () => {
  beforeEach(() => {
    syncMock.mockReset();
    syncMock.mockResolvedValue(['instagram']);
  });

  it('marks unavailable Android apps and prevents activation', async () => {
    const updateState = vi.fn();
    const navigate = vi.fn();

    render(<AppList state={DEFAULT_STATE} updateState={updateState} navigate={navigate} />);

    await waitFor(() => expect(syncMock).toHaveBeenCalled());
    expect(await screen.findByText('Nicht installiert')).toBeInTheDocument();

    const instagramSwitch = screen.getByRole('switch', {
      name: 'Instagram ist nicht installiert und kann nicht geschützt werden',
    });
    expect(instagramSwitch).toBeDisabled();

    const instagramDetails = screen.getByRole('button', {
      name: 'Instagram Details. Status: Nicht installiert',
    });
    expect(instagramDetails).toBeDisabled();
    expect(updateState).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('uses a neutral release default on first activation of an untouched legacy config', async () => {
    syncMock.mockResolvedValue([]);
    const updateState = vi.fn();
    const state = {
      ...DEFAULT_STATE,
      appsConfig: {
        ...DEFAULT_STATE.appsConfig,
        instagram: { id: 'instagram', ...DEFAULT_APP_CONFIG },
      },
    };

    render(<AppList state={state} updateState={updateState} navigate={vi.fn()} />);
    await waitFor(() => expect(syncMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('switch', { name: 'Instagram Schutz umschalten' }));

    expect(updateState).toHaveBeenCalledWith({
      appsConfig: expect.objectContaining({
        instagram: expect.objectContaining({
          active: true,
          mode: 'standard',
          updatedAt: expect.any(Number),
          timeWindows: {
            morningRules: 'normal',
            workRules: 'normal',
            eveningRules: 'normal',
            nightRules: 'normal',
            weekendRules: 'normal',
          },
          antiBinge: expect.objectContaining({ enabled: false }),
          reelsProtection: expect.objectContaining({ enabled: false }),
        }),
      }),
    });
  });

  it('applies a recurring weekly preset to every active app and marks the explicit edit', async () => {
    const updateState = vi.fn();
    const state = {
      ...DEFAULT_STATE,
      appsConfig: {
        youtube: {
          id: 'youtube',
          ...DEFAULT_APP_CONFIG,
          active: true,
        },
        reddit: {
          id: 'reddit',
          ...DEFAULT_APP_CONFIG,
          active: false,
        },
      },
    };

    render(<AppList state={state} updateState={updateState} navigate={vi.fn()} />);
    await screen.findByText('Nicht installiert');

    fireEvent.change(screen.getByLabelText('Plan auswählen'), { target: { value: 'sleep' } });

    expect(updateState).toHaveBeenCalledWith({
      appsConfig: {
        youtube: expect.objectContaining({
          active: true,
          updatedAt: expect.any(Number),
          timeWindows: {
            morningRules: 'normal',
            workRules: 'normal',
            eveningRules: 'strict',
            nightRules: 'block',
            weekendRules: 'normal',
          },
        }),
        reddit: expect.objectContaining({
          active: false,
          timeWindows: DEFAULT_APP_CONFIG.timeWindows,
        }),
      },
    });
  });
});
