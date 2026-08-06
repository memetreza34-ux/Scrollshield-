import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { MigrationRecoveryScreen } from './MigrationRecoveryScreen';

const createObjectUrlMock = vi.fn(() => 'blob:legacy-recovery');
const revokeObjectUrlMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  createObjectUrlMock.mockClear();
  revokeObjectUrlMock.mockClear();
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: createObjectUrlMock,
    revokeObjectURL: revokeObjectUrlMock,
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('MigrationRecoveryScreen', () => {
  it('blocks destructive guidance and explains that original data remains protected', async () => {
    const { container } = render(<MigrationRecoveryScreen onRetry={() => false} />);

    expect(screen.getByRole('heading', { name: 'Alte Daten sind geschützt' })).toBeInTheDocument();
    expect(screen.getByText(/nicht zurücksetzen oder deinstallieren/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Migration erneut versuchen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Legacy-Rohdaten sichern' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('reports a still-blocked retry without claiming data loss', () => {
    const retry = vi.fn(() => false);
    render(<MigrationRecoveryScreen onRetry={retry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Migration erneut versuchen' }));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('alten Daten wurden nicht gelöscht');
  });

  it('downloads every ScrollShield raw value as a local recovery package', () => {
    localStorage.setItem('scrollshield_state_v2', '{"legacy":true}');
    localStorage.setItem('scrollshield_profiles_v3_pending', 'pending');
    render(<MigrationRecoveryScreen onRetry={() => false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Legacy-Rohdaten sichern' }));

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:legacy-recovery');
    expect(screen.getByRole('status')).toHaveTextContent('Rohdatensicherung wurde erstellt');
  });
});
