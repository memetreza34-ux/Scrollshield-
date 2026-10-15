import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { AppState, DEFAULT_STATE } from '../types';
import { setLanguage } from '../i18n';
import { Onboarding, Welcome } from './OnboardingScreens';

afterEach(() => setLanguage('de'));

const androidState: AppState = { ...DEFAULT_STATE, operatingSystem: 'android' };

/** Picks the apps and walks to the permissions step. */
function openPermissionsStep(state: AppState, updateState = vi.fn(), navigate = vi.fn()) {
  render(<Onboarding state={state} updateState={updateState} navigate={navigate} />);
  fireEvent.click(screen.getByRole('checkbox', { name: /Instagram/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /TikTok/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
  fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
  return { updateState, navigate };
}

describe('Welcome', () => {
  it('renders primary actions and navigates from them', () => {
    const navigate = vi.fn();
    render(<Welcome navigate={navigate} />);

    expect(screen.getByRole('heading', { name: 'Instagram ja, Reels nein.' })).toBeInTheDocument();
    expect(screen.getByText('ScrollShield')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Loslegen' }));
    expect(navigate).toHaveBeenCalledWith('onboarding');

    fireEvent.click(screen.getByRole('button', { name: 'Mehr erfahren' }));
    expect(navigate).toHaveBeenCalledWith('support');
  });

  it('shows a still preview of the pause with the countdown at 5', () => {
    render(<Welcome navigate={vi.fn()} />);

    const preview = screen.getByRole('img', { name: /Vorschau der Pause/ });
    expect(preview).toHaveTextContent('Kurze Pause vor Instagram.');
    expect(preview).toHaveTextContent('5');
  });

  it('speaks English on an English phone', () => {
    setLanguage('en');
    render(<Welcome navigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Instagram yes, Reels no.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get started' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Preview of the pause/ })).toHaveTextContent(
      'A short pause before Instagram.',
    );
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(<Welcome navigate={vi.fn()} />);

    await expectNoA11yViolations(container);
  });
});

describe('Onboarding', () => {
  it('stops at the free limit with a sentence, not a paywall', async () => {
    const { container } = render(<Onboarding state={DEFAULT_STATE} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Instagram/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /TikTok/ }));

    expect(screen.getByRole('checkbox', { name: /YouTube/ })).toBeDisabled();
    expect(screen.getByText(/In der kostenlosen Version 2 Apps/)).toBeInTheDocument();
    expect(screen.getByText('2 von 2 gewählt · Instagram, TikTok')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('promises short-video protection only for apps with checked detection', () => {
    render(<Onboarding state={DEFAULT_STATE} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByRole('checkbox', { name: 'Instagram' })).toHaveAccessibleDescription(
      'Reels sperren oder begrenzen',
    );
    expect(screen.getByRole('checkbox', { name: 'Facebook' })).toHaveAccessibleDescription('Pause beim Öffnen');
  });

  it('protects the chosen apps with "Ausgewogen" when leaving the first step', () => {
    const updateState = vi.fn();
    render(<Onboarding state={DEFAULT_STATE} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Instagram/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    const { appsConfig } = updateState.mock.calls[0][0] as Pick<AppState, 'appsConfig'>;
    expect(appsConfig.instagram).toMatchObject({ active: true, preset: 'ausgewogen' });
    expect(screen.getByRole('heading', { name: "So funktioniert's" })).toBeInTheDocument();
  });

  it('finishes in the browser without asking for system permissions', () => {
    const { updateState, navigate } = openPermissionsStep(DEFAULT_STATE);

    expect(screen.getByText(/Vorschau im Browser/)).toBeInTheDocument();
    expect(screen.queryByText('App-Nutzungszugriff')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }));

    expect(updateState).toHaveBeenCalledWith({ hasCompletedOnboarding: true });
    expect(navigate).toHaveBeenCalledWith('today');
  });

  it('on Android lets the user go on without permissions, but never as the green button', () => {
    const { updateState, navigate } = openPermissionsStep(androidState);

    expect(screen.getByRole('heading', { name: 'Nötig für den Schutz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Erlauben: App-Nutzungszugriff' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Schutz starten' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ohne Berechtigungen weiter' }));
    expect(updateState).toHaveBeenCalledWith({ hasCompletedOnboarding: true });
    expect(navigate).toHaveBeenCalledWith('today');
  });

  it('offers "Schutz starten" once both required permissions are granted', async () => {
    const granted: AppState = {
      ...androidState,
      permissions: { ...androidState.permissions, usageAccess: true, overlay: true },
    };
    const { container } = render(<Onboarding state={granted} updateState={vi.fn()} navigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Instagram/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /TikTok/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(screen.getAllByText('Erteilt')).toHaveLength(2);
    expect(screen.getByText('Instagram und TikTok sind dann geschützt.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schutz starten' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
