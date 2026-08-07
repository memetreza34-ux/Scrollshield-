import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from '../types';
import { ProtectionInsightsPanel } from './ProtectionInsightsPanel';

const state = {
  ...DEFAULT_STATE,
  dailyStats: {
    '2026-07-31': {
      date: '2026-07-31',
      usageMinutes: { instagram: 60 },
      blockedOpens: 1,
      savedTimeMinutes: 5,
      emergencyUnlocks: 0,
      focusMinutes: 0,
    },
    '2026-08-01': {
      date: '2026-08-01',
      usageMinutes: { instagram: 40 },
      blockedOpens: 1,
      savedTimeMinutes: 5,
      emergencyUnlocks: 0,
      focusMinutes: 0,
    },
    '2026-08-06': {
      date: '2026-08-06',
      usageMinutes: { instagram: 15, youtube: 5 },
      blockedOpens: 3,
      savedTimeMinutes: 15,
      emergencyUnlocks: 1,
      focusMinutes: 20,
    },
    '2026-08-07': {
      date: '2026-08-07',
      usageMinutes: { instagram: 10 },
      blockedOpens: 2,
      savedTimeMinutes: 10,
      emergencyUnlocks: 0,
      focusMinutes: 30,
    },
  },
};

describe('ProtectionInsightsPanel', () => {
  it('shows measured local insights without presenting estimated saved time as measurement', () => {
    render(<ProtectionInsightsPanel state={state} now={new Date(2026, 7, 7, 12)} />);

    expect(screen.getByText('Lokale Insights')).toBeInTheDocument();
    expect(screen.getByText('30m')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Instagram · 25m')).toBeInTheDocument();
    expect(screen.getByText(/„Geschätzt gespart“ bleibt eine separate Produktschätzung/)).toBeInTheDocument();
  });

  it('switches between equal-length 7 and 30 day comparisons locally', () => {
    render(<ProtectionInsightsPanel state={state} now={new Date(2026, 7, 7, 12)} />);

    expect(screen.getByRole('button', { name: '7 Tage' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '30 Tage' }));
    expect(screen.getByRole('button', { name: '30 Tage' })).toHaveAttribute('aria-pressed', 'true');
  });
});
