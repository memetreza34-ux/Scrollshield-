import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_STATE } from '../types';
import { PermissionsScreen } from './PermissionsScreen';

// Platform-specific cards only render for their platform, so the state has to
// name one explicitly. DEFAULT_STATE is 'web', where neither Screen Time nor
// Usage Access exists.
const iosState = { ...DEFAULT_STATE, operatingSystem: 'ios' as const };
const androidState = { ...DEFAULT_STATE, operatingSystem: 'android' as const };

describe('PermissionsScreen', () => {
  it('labels permission actions with their context for screen readers', async () => {
    const { container } = render(
      <PermissionsScreen state={iosState} updateState={vi.fn()} navigate={vi.fn()} isOnboarding />,
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

  it('does not offer system permissions in the browser', () => {
    render(<PermissionsScreen state={DEFAULT_STATE} updateState={vi.fn()} navigate={vi.fn()} isOnboarding />);

    expect(screen.getByRole('heading', { name: 'Du nutzt die Webversion' })).toBeInTheDocument();
    expect(screen.queryByText('Bildschirmzeit-Zugriff (iPhone/iPad)')).not.toBeInTheDocument();
    expect(screen.queryByText('App-Nutzungszugriff')).not.toBeInTheDocument();
  });

  it('offers the Android permissions including short-video detection on Android', () => {
    render(<PermissionsScreen state={androidState} updateState={vi.fn()} navigate={vi.fn()} isOnboarding />);

    expect(screen.getByText('App-Nutzungszugriff')).toBeInTheDocument();
    expect(screen.getByText('Kurzvideo-Erkennung (Bedienungshilfe)')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Du nutzt die Webversion' })).not.toBeInTheDocument();
  });
});
