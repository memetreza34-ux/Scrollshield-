import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_STATE } from '../types';
import { PrivacyScreen } from './ConfigScreens';
import { ImprintScreen } from './SupportScreen';

const renderPrivacy = (resetApp = vi.fn()) =>
  render(
    <PrivacyScreen
      state={{ ...DEFAULT_STATE, hasCompletedOnboarding: true }}
      updateState={vi.fn()}
      resetApp={resetApp}
      navigate={vi.fn()}
    />,
  );

describe('PrivacyScreen', () => {
  it('says what is stored and links to the privacy policy', async () => {
    const { container } = renderPrivacy();

    expect(screen.getByText('Alles bleibt auf diesem Handy')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Was nie gespeichert wird' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Datenschutzerklärung' })).toHaveAttribute('href', '/privacy.html');
    await expectNoA11yViolations(container);
  });

  it('deletes everything only after the confirmation', () => {
    const resetApp = vi.fn();
    renderPrivacy(resetApp);

    fireEvent.click(screen.getByRole('button', { name: 'Alle Daten löschen' }));
    const dialog = screen.getByRole('dialog', { name: 'Alle Daten löschen?' });
    expect(resetApp).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Alles löschen' }));
    expect(resetApp).toHaveBeenCalledTimes(1);
  });

  it('keeps the data when the confirmation is cancelled', () => {
    const resetApp = vi.fn();
    renderPrivacy(resetApp);

    fireEvent.click(screen.getByRole('button', { name: 'Alle Daten löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(resetApp).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ImprintScreen', () => {
  it('links the privacy policy and the open-source licences', async () => {
    const { container } = render(<ImprintScreen navigate={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'Datenschutzerklärung' })).toHaveAttribute('href', '/privacy.html');
    expect(screen.getByRole('link', { name: 'Open-Source-Lizenzen' })).toHaveAttribute(
      'href',
      '/third-party-licenses.txt',
    );
    await expectNoA11yViolations(container);
  });
});
