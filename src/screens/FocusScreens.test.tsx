import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_STATE } from '../types';
import { Focus, FocusResult } from './FocusScreens';

describe('Focus', () => {
  it('names every schedule switch and has no obvious accessibility violations', async () => {
    const updateState = vi.fn();
    const { container } = render(<Focus state={DEFAULT_STATE} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Zeitpläne' }));

    expect(screen.getByRole('switch', { name: 'Zeitplan Arbeit / Deep Work' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Zeitplan Digital Detox / Schlaf' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Zeitplan Arbeit / Deep Work' }));
    expect(updateState).toHaveBeenCalledWith({
      focusSchedules: expect.arrayContaining([expect.objectContaining({ id: 'work', active: true })]),
    });
    await expectNoA11yViolations(container);
  });

  it('shows measured time after an interrupted session and allows closing the result', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();
    render(
      <FocusResult
        state={{
          ...DEFAULT_STATE,
          pendingFocusResultId: 'focus-1',
          focusSessions: [
            {
              id: 'focus-1',
              startTime: 1_000,
              endTime: 1_000 + 10 * 60_000 + 30_000,
              duration: 25,
              successful: false,
              protectedApps: [],
              blocksTriggered: 0,
            },
          ],
        }}
        updateState={updateState}
        navigate={navigate}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Fokus beendet.' })).toBeInTheDocument();
    expect(screen.getByText('10 Min')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zum Dashboard' }));
    expect(updateState).toHaveBeenCalledWith({ pendingFocusResultId: null });
    expect(navigate).toHaveBeenCalledWith('dashboard');
  });
});
