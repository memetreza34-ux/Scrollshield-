import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { AppState, Screen } from '../types';
import { IconButton, List, OptionList, Page, PrimaryButton, Row, Section, Switch, TextButton } from '../components/ui';
import { MessageKey, t } from '../i18n';
import { formatPeriod, loadProPlans, ProPlan, purchasePro } from '../lib/billing';
import { hasPro, PRO_BENEFITS } from '../lib/entitlements';

type ScreenProps = {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
};

/**
 * Paywall (docs/V1_MASTER_PLAN.md, 4.10): a calm page – what Pro adds, two
 * prices, "Später". Never during the onboarding, an interruption, an
 * emergency unlock or a commitment. Prices and the purchase come from Google
 * Play (src/lib/billing.ts); without Google Play (browser) the prices are a
 * preview and the button stays off.
 */
export function PaywallScreen({ state, updateState, navigate }: ScreenProps) {
  const pro = hasPro(state);
  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly');
  /** null while Google Play is asked, empty when it has no plans (browser). */
  const [plans, setPlans] = useState<ProPlan[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<MessageKey | null>(null);
  const close = () => {
    updateState({ paywallReason: null });
    navigate('today');
  };

  useEffect(() => {
    let cancelled = false;
    void loadProPlans().then((loaded) => {
      if (cancelled) return;
      setPlans(loaded);
      if (loaded.length > 0 && !loaded.some((entry) => entry.basePlanId === 'yearly')) setPlan('monthly');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const yearly = plans?.find((entry) => entry.basePlanId === 'yearly');
  const monthly = plans?.find((entry) => entry.basePlanId === 'monthly');
  const live = Boolean(yearly || monthly);
  const selected = plan === 'yearly' ? yearly : monthly;
  const trial = formatPeriod(yearly?.freeTrialPeriod);

  const buy = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setMessage(null);
    const status = await purchasePro(selected.basePlanId);
    setBusy(false);
    if (status === 'purchased') updateState({ pro: { active: true } });
    else if (status === 'pending') setMessage('paywall.pending');
    else if (status === 'unavailable') setMessage('paywall.unavailable');
    else if (status === 'error') setMessage('paywall.error');
  };

  const options = live
    ? [
        ...(yearly
          ? [
              {
                value: 'yearly' as const,
                label: t('paywall.yearly'),
                tag: t('paywall.perYear', { price: yearly.price }),
                description: trial ? t('paywall.yearlyTrialText', { trial }) : t('paywall.yearlyPlainText'),
              },
            ]
          : []),
        ...(monthly
          ? [
              {
                value: 'monthly' as const,
                label: t('paywall.monthly'),
                tag: t('paywall.perMonth', { price: monthly.price }),
                description: t('paywall.monthlyText'),
              },
            ]
          : []),
      ]
    : [
        {
          value: 'yearly' as const,
          label: t('paywall.yearly'),
          tag: t('paywall.yearlyPrice'),
          description: t('paywall.yearlyText'),
        },
        {
          value: 'monthly' as const,
          label: t('paywall.monthly'),
          tag: t('paywall.monthlyPrice'),
          description: t('paywall.monthlyText'),
        },
      ];

  const buyLabel =
    plan === 'monthly'
      ? t('paywall.startMonthly')
      : trial
        ? t('paywall.startTrialFor', { trial })
        : live
          ? t('paywall.startYearly')
          : t('paywall.startTrial');
  const legal = !live
    ? t('paywall.legal')
    : plan === 'yearly' && trial
      ? t('paywall.legalTrial', { trial })
      : t('paywall.legalPlain');

  return (
    <Page>
      <div className="-ml-3 flex h-16 items-center">
        <IconButton icon={X} label={t('paywall.close')} onClick={close} />
      </div>

      <h1 className="text-headline text-ink">{t('paywall.title')}</h1>
      {state.paywallReason && <p className="mt-3 text-title-s text-ink">{state.paywallReason}</p>}
      <p className="mb-6 mt-1 text-body-s text-muted">{t(pro ? 'paywall.active' : 'paywall.freeStays')}</p>

      <ul className="mb-6 flex flex-col gap-3">
        {PRO_BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-3 text-body text-ink">
            <Check size={20} strokeWidth={2} className="mt-0.5 flex-shrink-0 text-accent" aria-hidden="true" />
            {t(benefit)}
          </li>
        ))}
      </ul>

      {!pro && (
        <>
          <OptionList<'yearly' | 'monthly'>
            label={t('paywall.plans')}
            value={plan}
            onChange={(value) => {
              setPlan(value);
              setMessage(null);
            }}
            options={options}
          />
          {plans !== null && !live && <p className="mt-2 px-1 text-caption text-muted">{t('paywall.previewNote')}</p>}
          <div className="mt-6 flex flex-col gap-1">
            <PrimaryButton onClick={() => void buy()} disabled={!selected || busy}>
              {buyLabel}
            </PrimaryButton>
            <TextButton onClick={close}>{t('paywall.later')}</TextButton>
          </div>
          {message && (
            <p role="status" className="mt-3 px-1 text-center text-body-s text-ink">
              {t(message)}
            </p>
          )}
          <p className="mt-4 px-1 text-center text-caption text-muted">{legal}</p>
        </>
      )}

      <DevProSwitch pro={pro} updateState={updateState} />
    </Page>
  );
}

/** Development builds only: switches Pro on without a purchase so every screen can be seen. */
export function DevProSwitch({ pro, updateState }: { pro: boolean; updateState: (u: Partial<AppState>) => void }) {
  if (!import.meta.env.DEV) return null;
  return (
    <div className="mt-10">
      <Section title="Nur in der Entwicklung">
        <List>
          <Row
            label="Pro-Vorschau"
            description="Schaltet Pro ohne Kauf frei, damit du alle Seiten sehen kannst."
            right={
              <Switch checked={pro} ariaLabel="Pro-Vorschau" onChange={(active) => updateState({ pro: { active } })} />
            }
          />
        </List>
      </Section>
    </div>
  );
}
