import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from '../types';
import { PaywallScreen } from './SettingsScreens';

describe('PaywallScreen', () => {
  it('returns to the screen that triggered the contextual paywall', () => {
    const navigate = vi.fn();
    const updateState = vi.fn();

    render(
      <PaywallScreen
        state={{ ...DEFAULT_STATE, paywallReason: 'Für diese Funktion brauchst du Pro.' }}
        updateState={updateState}
        navigate={navigate}
        paywallReturnScreen="app_detail"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Später' }));

    expect(updateState).toHaveBeenCalledWith({ paywallReason: null });
    expect(navigate).toHaveBeenCalledWith('app_detail');
  });

  it('uses Heute as the safe fallback when no return screen is supplied', () => {
    const navigate = vi.fn();

    render(<PaywallScreen state={DEFAULT_STATE} updateState={vi.fn()} navigate={navigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Später' }));

    expect(navigate).toHaveBeenCalledWith('today');
  });
});
