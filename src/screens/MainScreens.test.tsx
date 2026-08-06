import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_STATE } from '../types';
import { Dashboard } from './MainScreens';

describe('Dashboard', () => {
  it('opens the protection flow from the quick test action', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();

    render(
      <Dashboard
        state={{ ...DEFAULT_STATE, hasCompletedOnboarding: true }}
        updateState={updateState}
        navigate={navigate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Schutzablauf testen' }));

    expect(updateState).toHaveBeenCalledWith({ simulatedAppToOpen: 'instagram' });
    expect(navigate).toHaveBeenCalledWith('protection_flow');
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(
      <Dashboard state={{ ...DEFAULT_STATE, hasCompletedOnboarding: true }} updateState={vi.fn()} navigate={vi.fn()} />,
    );

    await expectNoA11yViolations(container);
  });
});
