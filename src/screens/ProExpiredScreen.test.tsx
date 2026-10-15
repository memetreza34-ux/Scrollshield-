import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { AppState, DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { ProExpiredScreen } from './ProExpiredScreen';

const app = (id: string) => ({ ...DEFAULT_APP_CONFIG, id, active: true });

const state: AppState = {
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  appsConfig: {
    instagram: app('instagram'),
    tiktok: app('tiktok'),
    youtube: app('youtube'),
    snapchat: app('snapchat'),
  },
};

describe('ProExpiredScreen', () => {
  it('keeps two apps and pauses the others without deleting their rules', async () => {
    const updateState = vi.fn();
    const { container } = render(<ProExpiredScreen state={state} updateState={updateState} navigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Welche 2 Apps sollen geschützt bleiben?' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Instagram' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'YouTube' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('2 von 2 gewählt · YouTube und Snapchat werden pausiert');
    await expectNoA11yViolations(container);

    fireEvent.click(screen.getByRole('checkbox', { name: 'TikTok' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'YouTube' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mit Free weitermachen' }));

    const { appsConfig } = updateState.mock.calls[0][0] as Pick<AppState, 'appsConfig'>;
    expect(appsConfig.instagram.active).toBe(true);
    expect(appsConfig.youtube.active).toBe(true);
    expect(appsConfig.tiktok).toEqual({ ...state.appsConfig.tiktok, active: false });
    expect(appsConfig.snapchat.active).toBe(false);
  });

  it('leads to the paywall to renew Pro', () => {
    const navigate = vi.fn();
    render(<ProExpiredScreen state={state} updateState={vi.fn()} navigate={navigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pro erneuern' }));

    expect(navigate).toHaveBeenCalledWith('paywall');
  });
});
