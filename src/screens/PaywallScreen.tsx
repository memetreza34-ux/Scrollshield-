import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { AppState, Screen } from '../types';
import { IconButton, List, OptionList, Page, PrimaryButton, Row, Section, Switch, TextButton } from '../components/ui';
import { t } from '../i18n';
import { hasPro, PRO_BENEFITS } from '../lib/entitlements';

type ScreenProps = {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
};

/**
 * Paywall (docs/V1_MASTER_PLAN.md, 4.10): a calm page – what Pro adds, two
 * prices, "Später". Never during the onboarding, an interruption, an
 * emergency unlock or a commitment. Buying arrives with Google Play billing;
 * until then the prices are a preview and the button stays off.
 */
export function PaywallScreen({ state, updateState, navigate }: ScreenProps) {
  const pro = hasPro(state);
  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly');
  const close = () => {
    updateState({ paywallReason: null });
    navigate('today');
  };

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
            onChange={setPlan}
            options={[
              {
                value: 'yearly',
                label: t('paywall.yearly'),
                tag: t('paywall.yearlyPrice'),
                description: t('paywall.yearlyText'),
              },
              {
                value: 'monthly',
                label: t('paywall.monthly'),
                tag: t('paywall.monthlyPrice'),
                description: t('paywall.monthlyText'),
              },
            ]}
          />
          <p className="mt-2 px-1 text-caption text-muted">{t('paywall.previewNote')}</p>
          <div className="mt-6 flex flex-col gap-1">
            <PrimaryButton onClick={() => undefined} disabled>
              {t(plan === 'yearly' ? 'paywall.startTrial' : 'paywall.startMonthly')}
            </PrimaryButton>
            <TextButton onClick={close}>{t('paywall.later')}</TextButton>
          </div>
          <p className="mt-4 px-1 text-center text-caption text-muted">{t('paywall.legal')}</p>
        </>
      )}

      {import.meta.env.DEV && (
        <div className="mt-10">
          <Section title="Nur in der Entwicklung">
            <List>
              <Row
                label="Pro-Vorschau"
                description="Schaltet Pro ohne Kauf frei, damit du alle Seiten sehen kannst."
                right={
                  <Switch
                    checked={pro}
                    ariaLabel="Pro-Vorschau"
                    onChange={(active) => updateState({ pro: { active } })}
                  />
                }
              />
            </List>
          </Section>
        </div>
      )}
    </Page>
  );
}
