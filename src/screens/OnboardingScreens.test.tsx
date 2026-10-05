import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_STATE } from '../types';
import { Onboarding, Welcome } from './OnboardingScreens';

describe('Welcome', () => {
  it('renders primary actions and navigates from them', () => {
    const navigate = vi.fn();
    render(<Welcome navigate={navigate} />);

    expect(screen.getByRole('heading', { name: 'ScrollShield' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Loslegen' }));
    expect(navigate).toHaveBeenCalledWith('onboarding');

    fireEvent.click(screen.getByRole('button', { name: 'Mehr erfahren' }));
    expect(navigate).toHaveBeenCalledWith('help');
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(<Welcome navigate={vi.fn()} />);

    await expectNoA11yViolations(container);
  });
});

describe('Onboarding', () => {
  it('finishes after choosing goals and a profile without a fake permission step', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();
    render(<Onboarding state={DEFAULT_STATE} updateState={updateState} navigate={navigate} />);

    fireEvent.click(screen.getByRole('button', { name: /Instagram/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByRole('heading', { name: 'Startprofil wählen' })).toBeInTheDocument();
    expect(screen.getByText(/Automatische Sperren anderer Apps/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'App einrichten' }));

    expect(updateState).toHaveBeenCalledWith(expect.objectContaining({ hasCompletedOnboarding: true }));
    expect(navigate).toHaveBeenCalledWith('dashboard');
    expect(navigate).not.toHaveBeenCalledWith('permissions');
  });
});
