import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { BottomNav, Switch, TimeSelector } from './ui';

describe('Switch', () => {
  it('announces state and toggles on click', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} ariaLabel="Schutz umschalten" />);

    const toggle = screen.getByRole('switch', { name: 'Schutz umschalten' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(<Switch checked={false} onChange={vi.fn()} ariaLabel="Schutz umschalten" />);

    await expectNoA11yViolations(container);
  });
});

describe('TimeSelector', () => {
  it('emits numeric option changes', () => {
    const onChange = vi.fn();
    render(<TimeSelector value={5} onChange={onChange} options={[5, 10, 15]} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } });

    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('supports disabled zero values when allowed', () => {
    const onChange = vi.fn();
    render(<TimeSelector value={5} onChange={onChange} options={[5, 10]} allowDisabled />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '0' } });

    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(<TimeSelector value={5} onChange={vi.fn()} options={[5, 10, 15]} />);

    await expectNoA11yViolations(container);
  });
});

describe('BottomNav', () => {
  it('keeps the V1 navigation to exactly Heute, Schutz and Einblicke', () => {
    render(<BottomNav currentScreen="today" navigate={vi.fn()} />);

    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' });
    expect(nav.querySelectorAll('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Heute' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schutz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Einblicke' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fokus' })).not.toBeInTheDocument();
  });

  it('maps nested protection screens to the Schutz tab', () => {
    render(<BottomNav currentScreen="app_detail" navigate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Schutz' })).toHaveAttribute('aria-current', 'page');
  });
});
