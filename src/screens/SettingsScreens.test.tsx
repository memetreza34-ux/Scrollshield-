import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { AppState, DEFAULT_STATE } from '../types';
import { setLanguage } from '../i18n';
import { NotificationsScreen, ProStatusScreen, SettingsScreen } from './SettingsScreens';

afterEach(() => setLanguage('de'));

const state = (overrides: Partial<AppState> = {}): AppState => ({
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  ...overrides,
});

describe('SettingsScreen', () => {
  it('shows the Pro card and the three groups', async () => {
    const navigate = vi.fn();
    const { container } = render(<SettingsScreen state={state()} updateState={vi.fn()} navigate={navigate} />);

    expect(screen.getByRole('heading', { name: 'Schutz' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mitteilungen & Daten' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hilfe & Rechtliches' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ScrollShield Pro/ }));
    expect(navigate).toHaveBeenCalledWith('pro_status');
    await expectNoA11yViolations(container);
  });

  it('saves the own sentence for the pause, trimmed', () => {
    const updateState = vi.fn();
    render(<SettingsScreen state={state()} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Eigener Satz in der Pause/ }));
    const dialog = screen.getByRole('dialog', { name: 'Eigener Satz in der Pause' });
    fireEvent.change(within(dialog).getByLabelText('Dein Satz'), {
      target: { value: '  Abends lieber lesen  als scrollen. ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }));

    expect(updateState).toHaveBeenCalledWith({
      settings: expect.objectContaining({ pauseLine: 'Abends lieber lesen als scrollen.' }),
    });
  });

  it('switches the language from a sheet', () => {
    const updateState = vi.fn();
    render(<SettingsScreen state={state()} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Sprache/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'English' }));

    expect(updateState).toHaveBeenCalledWith({ settings: expect.objectContaining({ language: 'en' }) });
  });
});

describe('ProStatusScreen', () => {
  it('shows Free with what Pro adds and leads to the prices', async () => {
    const navigate = vi.fn();
    const { container } = render(<ProStatusScreen state={state()} updateState={vi.fn()} navigate={navigate} />);

    expect(screen.getByText('Free')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preise ansehen' }));
    expect(navigate).toHaveBeenCalledWith('paywall');
    await expectNoA11yViolations(container);
  });
});

describe('NotificationsScreen', () => {
  it('offers the three kinds; the weekly review leads to the paywall in Free', () => {
    const navigate = vi.fn();
    render(<NotificationsScreen state={state()} updateState={vi.fn()} navigate={navigate} />);

    expect(screen.getByRole('switch', { name: 'Fokus-Ende' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Tageszusammenfassung' })).not.toBeChecked();
    expect(screen.queryByRole('switch', { name: 'Wochenrückblick' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Wochenrückblick/ }));
    expect(navigate).toHaveBeenCalledWith('paywall');
  });

  it('has a switch for the weekly review with Pro', () => {
    render(<NotificationsScreen state={state({ pro: { active: true } })} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByRole('switch', { name: 'Wochenrückblick' })).toBeChecked();
  });
});
