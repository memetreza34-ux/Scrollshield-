import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from '../types';
import { PaywallScreen } from './SettingsScreens';

const play = vi.hoisted(() => ({
  native: vi.fn(),
  catalog: vi.fn(),
  purchases: vi.fn(),
}));

vi.mock('../lib/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/billing')>()),
  isNativePlayBilling: play.native,
  getPlayCatalog: play.catalog,
  getPlayPurchaseOverview: play.purchases,
}));

describe('PaywallScreen', () => {
  beforeEach(() => {
    play.native.mockReturnValue(false);
    play.catalog.mockReset();
    play.purchases.mockReset();
  });

  it('returns to the screen that triggered the contextual paywall', () => {
    const navigate = vi.fn();
    const updateState = vi.fn();

    render(
      <PaywallScreen
        state={{ ...DEFAULT_STATE, paywallReason: 'Für diese Funktion brauchst du Pro.' }}
        updateState={updateState}
        navigate={navigate}
        paywallReturnScreen="app_detail"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Später' }));

    expect(updateState).toHaveBeenCalledWith({ paywallReason: null });
    expect(navigate).toHaveBeenCalledWith('app_detail');
  });

  it('keeps the purchase button disabled on the web', () => {
    render(<PaywallScreen state={DEFAULT_STATE} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Kaufen noch nicht verfügbar' })).toBeDisabled();
    expect(screen.getByText(/ausschließlich in der Android-App/)).toBeInTheDocument();
    expect(play.catalog).not.toHaveBeenCalled();
  });

  it('shows eligible Google Play pricing without inventing a local price', async () => {
    play.native.mockReturnValue(true);
    play.catalog.mockResolvedValue({
      available: true,
      plans: [{
        productId: 'scrollshield_pro',
        basePlanId: 'annual',
        title: 'ScrollShield Pro',
        description: 'Jahres-Abo',
        phases: [
          { formattedPrice: '0,00 €', billingPeriod: 'P7D', billingCycleCount: 1, recurrenceMode: 2, isFree: true },
          { formattedPrice: '29,99 €', billingPeriod: 'P1Y', billingCycleCount: 0, recurrenceMode: 1, isFree: false },
        ],
      }],
    });

    render(<PaywallScreen state={DEFAULT_STATE} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(await screen.findByText('Kostenlos / 7 Tage → 29,99 € / Jahr')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kaufen noch nicht verfügbar' })).toBeDisabled();
    expect(play.catalog).toHaveBeenCalledOnce();
  });

  it('observes existing Play purchases but never silently enables Pro', async () => {
    play.native.mockReturnValue(true);
    play.catalog.mockResolvedValue({ available: true, plans: [] });
    play.purchases.mockResolvedValue({
      available: true,
      purchases: [{ state: 'purchased_unverified', acknowledged: true }],
    });
    const updateState = vi.fn();
    render(<PaywallScreen state={DEFAULT_STATE} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Bestehende Play-Abos prüfen' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Pro wurde nicht freigeschaltet');
    expect(updateState).not.toHaveBeenCalledWith({ pro: { active: true } });
    expect(play.purchases).toHaveBeenCalledOnce();
  });

  it('uses Heute as the safe fallback when no return screen is supplied', () => {
    const navigate = vi.fn();

    render(<PaywallScreen state={DEFAULT_STATE} updateState={vi.fn()} navigate={navigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Später' }));

    expect(navigate).toHaveBeenCalledWith('today');
  });
});
