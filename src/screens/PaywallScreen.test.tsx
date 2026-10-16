import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppState, DEFAULT_STATE } from '../types';

const billing = vi.hoisted(() => ({
  loadProPlans: vi.fn(),
  purchasePro: vi.fn(),
  readProStatus: vi.fn(),
  manageSubscription: vi.fn(),
}));

vi.mock('../lib/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/billing')>()),
  ...billing,
}));

import { PaywallScreen } from './PaywallScreen';
import { ProStatusScreen } from './SettingsScreens';

const state = (overrides: Partial<AppState> = {}): AppState => ({
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  ...overrides,
});

const PLANS = [
  { basePlanId: 'yearly', price: '24,99 €', billingPeriod: 'P1Y', freeTrialPeriod: 'P1W' },
  { basePlanId: 'monthly', price: '4,49 €', billingPeriod: 'P1M' },
];

beforeEach(() => {
  Object.values(billing).forEach((mock) => mock.mockReset());
});

describe('PaywallScreen with Google Play', () => {
  it('shows the prices from Google Play, not the preview', async () => {
    billing.loadProPlans.mockResolvedValue(PLANS);
    render(<PaywallScreen state={state()} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(await screen.findByText(/24,99 €\s\/\sJahr/)).toBeInTheDocument();
    expect(screen.getByText(/4,49 €\s\/\sMonat/)).toBeInTheDocument();
    expect(screen.getByText('7 Tage gratis, dann jährlich. Jederzeit kündbar.')).toBeInTheDocument();
    expect(screen.queryByText(/Preise als Vorschau/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7 Tage gratis testen' })).toBeEnabled();
  });

  it('turns Pro on after a purchase', async () => {
    billing.loadProPlans.mockResolvedValue(PLANS);
    billing.purchasePro.mockResolvedValue('purchased');
    const updateState = vi.fn();
    render(<PaywallScreen state={state()} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: '7 Tage gratis testen' }));

    await waitFor(() => expect(updateState).toHaveBeenCalledWith({ pro: { active: true } }));
    expect(billing.purchasePro).toHaveBeenCalledWith('yearly');
  });

  it('keeps Pro off while the payment is pending and says so', async () => {
    billing.loadProPlans.mockResolvedValue(PLANS);
    billing.purchasePro.mockResolvedValue('pending');
    const updateState = vi.fn();
    render(<PaywallScreen state={state()} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(await screen.findByText('Monatlich'));
    fireEvent.click(screen.getByRole('button', { name: 'Monatlich abonnieren' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Die Zahlung ist noch nicht bestätigt.');
    expect(billing.purchasePro).toHaveBeenCalledWith('monthly');
    expect(updateState).not.toHaveBeenCalledWith({ pro: { active: true } });
  });

  it('stays a preview with the button off when Google Play has no plans', async () => {
    billing.loadProPlans.mockResolvedValue([]);
    render(<PaywallScreen state={state()} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(await screen.findByText(/Preise als Vorschau/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7 Tage gratis testen' })).toBeDisabled();
  });
});

describe('ProStatusScreen restore', () => {
  it('turns Pro on when Google Play finds the subscription', async () => {
    billing.readProStatus.mockResolvedValue({ available: true, active: true });
    const updateState = vi.fn();
    render(<ProStatusScreen state={state()} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Käufe wiederherstellen' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Pro ist wiederhergestellt.');
    expect(updateState).toHaveBeenCalledWith({ pro: { active: true } });
  });

  it('changes nothing when Google Play cannot be reached', async () => {
    billing.readProStatus.mockResolvedValue({ available: false, active: false });
    const updateState = vi.fn();
    render(<ProStatusScreen state={state({ pro: { active: true } })} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Käufe wiederherstellen' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Google Play ist gerade nicht erreichbar.');
    expect(updateState).not.toHaveBeenCalled();
  });
});
