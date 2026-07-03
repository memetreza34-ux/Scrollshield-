import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { SupportScreen } from './SupportScreen';

describe('SupportScreen', () => {
  it('opens privacy and deletion request mails', () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign },
    });

    render(<SupportScreen navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Datenschutzanfrage senden/i }));
    expect(assign).toHaveBeenCalledWith(expect.stringContaining('subject=Datenschutzanfrage%3A+ScrollShield'));

    fireEvent.click(screen.getByRole('button', { name: /Datenlöschanfrage senden/i }));
    expect(assign).toHaveBeenCalledWith(expect.stringContaining('subject=Datenl%C3%B6schanfrage%3A+ScrollShield'));
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(<SupportScreen navigate={vi.fn()} />);

    await expectNoA11yViolations(container);
  });
});
