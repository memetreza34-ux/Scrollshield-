import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_STATE } from '../types';
import { PermissionsScreen } from './PermissionsScreen';

describe('PermissionsScreen', () => {
  it('labels permission actions with their context for screen readers', async () => {
    const { container } = render(
      <PermissionsScreen state={DEFAULT_STATE} updateState={vi.fn()} navigate={vi.fn()} isOnboarding />,
    );

    expect(screen.getByRole('button', { name: 'Aktivieren: Benachrichtigungen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Später: Benachrichtigungen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mehr erfahren: Bildschirmzeit-Zugriff (iPhone/iPad)' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByText(/Die übrigen Schutzregeln bleiben erhalten/)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/Managed Settings|Shielding|asynchron/);
    await expectNoA11yViolations(container);
  });

  it('allows onboarding to finish without granting optional or required permissions', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();

    render(<PermissionsScreen state={DEFAULT_STATE} updateState={updateState} navigate={navigate} isOnboarding />);

    fireEvent.click(screen.getByRole('button', { name: 'Schutzschirm ist bereit' }));

    expect(updateState).toHaveBeenCalledWith({ hasCompletedOnboarding: true });
    expect(updateState).not.toHaveBeenCalledWith(expect.objectContaining({ permissions: expect.anything() }));
    expect(navigate).toHaveBeenCalledWith('dashboard');
  });

  it('keeps a skipped permission disabled', () => {
    const updateState = vi.fn();

    render(<PermissionsScreen state={DEFAULT_STATE} updateState={updateState} navigate={vi.fn()} isOnboarding />);
    fireEvent.click(screen.getByRole('button', { name: 'Später: Benachrichtigungen' }));

    expect(updateState).toHaveBeenCalledWith({
      permissions: { ...DEFAULT_STATE.permissions, notifications: false },
    });
  });
});
