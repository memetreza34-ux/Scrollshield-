import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { expectNoA11yViolations } from './test/a11y';
import { createCommitmentLock, saveCommitmentLock } from './lib/commitmentLock';
import { StorageService } from './lib/storage';
import { DEFAULT_STATE } from './types';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts on the welcome screen without saved state', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'ScrollShield' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Loslegen' })).toBeInTheDocument();
  });

  it('keeps release help reachable before onboarding is completed', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Was kann Version 1?' }));

    expect(await screen.findByRole('heading', { name: 'Hilfe' })).toBeInTheDocument();
    expect(screen.getByText('Was ScrollShield v1 schützt')).toBeInTheDocument();
  });

  it('returns the shared scroll area to the top when changing screens', async () => {
    render(<App />);
    const scrollArea = await screen.findByTestId('screen-scroll');
    scrollArea.scrollTop = 300;

    fireEvent.click(screen.getByRole('button', { name: 'Loslegen' }));

    expect(await screen.findByRole('heading', { name: 'Apps auswählen' })).toBeInTheDocument();
    await waitFor(() => expect(scrollArea.scrollTop).toBe(0));
  });

  it('has no obvious accessibility violations on the welcome screen', async () => {
    const { container } = render(<App />);

    expect(await screen.findByRole('heading', { name: 'ScrollShield' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('restores a running focus session from its start timestamp on the release dashboard', async () => {
    const now = new Date(2030, 0, 1, 12).getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    StorageService.saveState({
      ...DEFAULT_STATE,
      hasCompletedOnboarding: true,
      isFocusModeActive: true,
      focusTimeRemaining: 25,
      focusSessions: [
        {
          id: 'focus-restart',
          startTime: now - 10 * 60_000,
          endTime: null,
          duration: 25,
          successful: false,
          protectedApps: ['instagram'],
          blocksTriggered: 0,
        },
      ],
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Fokus aktiv' })).toBeInTheDocument();
    expect(screen.getByLabelText('Noch 15 Minuten')).toBeInTheDocument();
  });

  it('clears persisted data and the device-local commitment lock after a confirmed reset', async () => {
    StorageService.saveState({
      ...DEFAULT_STATE,
      hasCompletedOnboarding: true,
      stats: { ...DEFAULT_STATE.stats, totalSavedTime: 120 },
    });
    expect(saveCommitmentLock(createCommitmentLock(60, Date.now()))).toBe(true);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Einstellungen' }));
    expect(await screen.findByRole('heading', { name: 'Menü' }, { timeout: 5000 })).toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Datenschutz & lokale Daten/,
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: /App zurücksetzen/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ja, Reset' }));

    expect(await screen.findByRole('heading', { name: 'ScrollShield' })).toBeInTheDocument();
    await waitFor(() => {
      expect(Object.keys(localStorage).filter((key) => key.startsWith('scrollshield_'))).toEqual([]);
    });
  });

  it('does not restore an obsolete simulated app session as a release screen', async () => {
    StorageService.saveState({
      ...DEFAULT_STATE,
      hasCompletedOnboarding: true,
      simulatedAppToOpen: 'instagram',
      activeSession: {
        appId: 'instagram',
        startTime: Date.now() - 60_000,
        extensionCount: 0,
        isPaused: false,
      },
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Dein Schutz heute.' })).toBeInTheDocument();
    expect(screen.queryByText(/Aktive Sitzung/)).not.toBeInTheDocument();
  });
});
