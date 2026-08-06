import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_STATE } from '../types';
import { Focus } from './FocusScreens';

describe('Focus', () => {
  it('names every schedule switch and has no obvious accessibility violations', async () => {
    const { container } = render(<Focus state={DEFAULT_STATE} updateState={vi.fn()} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Zeitpläne' }));

    expect(screen.getByRole('switch', { name: 'Zeitplan Arbeit / Deep Work' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Zeitplan Digital Detox / Schlaf' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
