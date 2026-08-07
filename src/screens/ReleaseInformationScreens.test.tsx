import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from '../types';
import { HelpScreen } from './HelpScreen';
import { HistoryScreen } from './HistoryScreen';
import { ReleaseSupportScreen } from './ReleaseSupportScreen';
import { SettingsScreen } from './SettingsScreen';

const androidState = {
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  operatingSystem: 'android' as const,
};

describe('release information screens', () => {
  it('settings exposes real destinations without demo reminder toggles', () => {
    const navigate = vi.fn();
    render(<SettingsScreen state={androidState} navigate={navigate} />);

    fireEvent.click(screen.getByRole('button', { name: /Schutzstatus & Berechtigungen/ }));
    expect(navigate).toHaveBeenCalledWith('permissions');
    expect(screen.queryByRole('switch', { name: /Tageszusammenfassung|Wochenrückblick|Rückfall-Warnung/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Abo-Funktionen werden hier bewusst nicht als aktive Einstellungen angeboten/)).toBeInTheDocument();
  });

  it('help states whole-app Android scope and does not claim finished iOS enforcement', () => {
    render(<HelpScreen state={androidState} navigate={vi.fn()} />);

    expect(screen.getByText(/gesamte ausgewählte App/)).toBeInTheDocument();
    expect(screen.getByText(/Reels-, Shorts-, Feed-Elemente oder Swipe-Bewegungen werden in Version 1 nicht separat erkannt/)).toBeInTheDocument();

    render(<HelpScreen state={{ ...androidState, operatingSystem: 'ios' }} navigate={vi.fn()} />);
    expect(screen.getByText(/iOS-Oberfläche ist derzeit nur Produktvorschau/)).toBeInTheDocument();
  });

  it('history separates measured usage from estimated saved time', () => {
    render(<HistoryScreen state={androidState} navigate={vi.fn()} />);

    expect(screen.getByText('Gemessene Freigabezeit')).toBeInTheDocument();
    expect(screen.getByText('Geschätzt gespart')).toBeInTheDocument();
    expect(screen.getByText(/fünf Minuten pro Block-\/Warnintervention als Produktschätzung/)).toBeInTheDocument();
  });

  it('support directs local data deletion to local controls instead of claiming server-side usage data', () => {
    const navigate = vi.fn();
    render(<ReleaseSupportScreen navigate={navigate} />);

    expect(screen.getByText(/keinen ScrollShield-Account und keinen Cloud-Sync/)).toBeInTheDocument();
    expect(screen.queryByText(/Serverseitige Daten prüfen und löschen lassen/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lokale Daten verwalten' }));
    expect(navigate).toHaveBeenCalledWith('privacy');
  });
});
