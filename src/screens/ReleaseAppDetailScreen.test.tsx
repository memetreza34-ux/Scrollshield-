import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { ReleaseAppDetailScreen } from './ReleaseAppDetailScreen';

const legacyUntouchedState = {
  ...DEFAULT_STATE,
  selectedAppId: 'instagram',
  appsConfig: {
    ...DEFAULT_STATE.appsConfig,
    instagram: { id: 'instagram', ...DEFAULT_APP_CONFIG },
  },
};

describe('ReleaseAppDetailScreen', () => {
  it('turns an untouched legacy default into a neutral release config before activation', () => {
    const updateState = vi.fn();
    render(<ReleaseAppDetailScreen state={legacyUntouchedState} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('switch', { name: 'Instagram Schutz aktivieren' }));

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
          reelsProtection: expect.objectContaining({ enabled: false, mode: 'allow' }),
        }),
      }),
    });
  });

  it('preserves explicitly edited rules and refreshes their updatedAt marker', () => {
    const updateState = vi.fn();
    const state = {
      ...legacyUntouchedState,
      appsConfig: {
        ...legacyUntouchedState.appsConfig,
        instagram: {
          id: 'instagram',
          ...DEFAULT_APP_CONFIG,
          active: true,
          updatedAt: 123,
          timeWindows: {
            ...DEFAULT_APP_CONFIG.timeWindows,
            morningRules: 'block' as const,
          },
        },
      },
    };

    render(<ReleaseAppDetailScreen state={state} updateState={updateState} navigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Bewusste Pause' }));

    expect(updateState).toHaveBeenCalledWith({
      appsConfig: expect.objectContaining({
        instagram: expect.objectContaining({
          timeWindows: expect.objectContaining({ morningRules: 'block' }),
          updatedAt: expect.any(Number),
        }),
      }),
    });
  });
});
