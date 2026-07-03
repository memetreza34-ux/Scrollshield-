import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { Welcome } from './OnboardingScreens';

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
