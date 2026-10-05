import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_STATE } from '../types';
import { PermissionsScreen } from './PermissionsScreen';

describe('PermissionsScreen in the browser', () => {
  it('explains the browser limitation without offering fake permission switches', async () => {
    const { container } = render(<PermissionsScreen state={DEFAULT_STATE} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Im Browser ohne Gerätezugriff' })).toBeInTheDocument();
    expect(screen.getByText(/weder Bildschirmzeit-Berechtigungen anfordern/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aktivieren:/ })).not.toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('can finish onboarding without changing permission values', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();

    render(<PermissionsScreen state={DEFAULT_STATE} updateState={updateState} navigate={navigate} isOnboarding />);
    fireEvent.click(screen.getByRole('button', { name: 'App einrichten' }));

    expect(updateState).toHaveBeenCalledWith({ hasCompletedOnboarding: true });
    expect(updateState).not.toHaveBeenCalledWith(expect.objectContaining({ permissions: expect.anything() }));
    expect(navigate).toHaveBeenCalledWith('dashboard');
  });
});
