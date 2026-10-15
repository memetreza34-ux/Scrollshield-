import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { SupportScreen } from './SupportScreen';

describe('SupportScreen', () => {
  it('has its own section for each phone maker', async () => {
    const { container } = render(<SupportScreen navigate={vi.fn()} />);

    for (const maker of ['Samsung', 'Xiaomi, Redmi, POCO', 'Huawei, Honor', 'OnePlus, OPPO, realme', 'Google Pixel']) {
      expect(screen.getByRole('button', { name: maker })).toHaveAttribute('aria-expanded', 'false');
    }

    fireEvent.click(screen.getByRole('button', { name: 'Samsung' }));
    expect(screen.getByRole('button', { name: 'Samsung' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Anleitung für Samsung/)).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('opens a short guide in a sheet', () => {
    render(<SupportScreen navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Was Free kann, was Pro kann' }));

    expect(screen.getByRole('dialog', { name: 'Was Free kann, was Pro kann' })).toHaveTextContent(
      'Free schützt 2 Apps',
    );
  });

  it('opens a problem mail with the device details', () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { assign } });

    render(<SupportScreen navigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Problem melden/ }));

    expect(assign).toHaveBeenCalledWith(expect.stringContaining('subject=Problem+mit+ScrollShield'));
    expect(assign).toHaveBeenCalledWith(expect.stringContaining('ScrollShield+'));
  });

  it('leads back to where it was opened from', () => {
    const navigate = vi.fn();
    render(<SupportScreen navigate={navigate} backTo="welcome" />);

    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));

    expect(navigate).toHaveBeenCalledWith('welcome');
  });
});
