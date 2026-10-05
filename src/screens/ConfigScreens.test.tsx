import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_STATE } from '../types';
import { AppDetail, AppList, PrivacyScreen, Rules, Settings } from './ConfigScreens';

describe('Rules', () => {
  it('keeps custom profile selection and editing as separate accessible actions', () => {
    const baseProfile = DEFAULT_STATE.profiles[0];
    const customProfile = {
      ...baseProfile,
      id: 'custom-reading',
      name: 'Nur Lesen',
      description: 'Ein eigenes Profil',
      isCustom: true,
    };

    render(
      <Rules
        state={{ ...DEFAULT_STATE, profiles: [...DEFAULT_STATE.profiles, customProfile] }}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: /Nur Lesen/ })).toBeInTheDocument();
    const editButton = screen.getByRole('button', { name: 'Profil Nur Lesen bearbeiten' });

    fireEvent.click(editButton);

    expect(screen.getByRole('heading', { name: 'Profil bearbeiten' })).toBeInTheDocument();
  });
});

describe('AppList', () => {
  it('exposes app details and protection switches as separate accessible actions', async () => {
    const { container } = render(
      <AppList state={{ ...DEFAULT_STATE, hasCompletedOnboarding: true }} updateState={vi.fn()} navigate={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Instagram Details. Status: Nicht ausgewählt' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Regel für Instagram umschalten' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

describe('AppDetail in the browser', () => {
  it('presents an app as a personal goal and explains the technical limit', async () => {
    const { container } = render(
      <AppDetail state={{ ...DEFAULT_STATE, selectedAppId: 'instagram' }} updateState={vi.fn()} navigate={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { name: 'Instagram als Ziel' })).toBeInTheDocument();
    expect(screen.getByText(/weder erkennen noch sperren/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Instagram als Ziel auswählen' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

describe('Settings', () => {
  it('has no obvious accessibility violations', async () => {
    const { container } = render(
      <Settings
        state={{ ...DEFAULT_STATE, hasCompletedOnboarding: true }}
        updateState={vi.fn()}
        resetApp={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    await expectNoA11yViolations(container);
  });
});

describe('PrivacyScreen', () => {
  it('links to the public privacy page and has no obvious accessibility violations', async () => {
    const { container } = render(
      <PrivacyScreen
        state={{ ...DEFAULT_STATE, hasCompletedOnboarding: true }}
        updateState={vi.fn()}
        resetApp={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: 'Öffentliche Datenschutzseite' })).toHaveAttribute('href', '/privacy.html');
    await expectNoA11yViolations(container);
  });
});
