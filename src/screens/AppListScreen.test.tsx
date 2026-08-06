import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from '../types';
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
});
