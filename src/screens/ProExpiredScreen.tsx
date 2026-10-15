import { useState } from 'react';
import { Check } from 'lucide-react';
import { AppState, Screen, SUPPORTED_APPS } from '../types';
import { AppTile, List, PrimaryButton, StatusChip, TextButton } from '../components/ui';
import { t } from '../i18n';
import { FREE_LIMITS, paywallFor } from '../lib/entitlements';
import { joinNames } from '../lib/format';

/**
 * Pro ended while more apps are protected than Free allows (Ergänzung vom
 * 14.10.): the user picks which stay. The others are paused – switched off
 * with their rules kept – not deleted.
 */
export function ProExpiredScreen({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const limit = FREE_LIMITS.protectedApps;
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);
  const [kept, setKept] = useState<string[]>(() => protectedApps.slice(0, limit).map((app) => app.id));
  const paused = protectedApps.filter((app) => !kept.includes(app.id));
  const pausedNames = joinNames(
    paused.map((app) => app.name),
    'and',
  );

  const continueWithFree = () => {
    const appsConfig = { ...state.appsConfig };
    for (const app of paused) appsConfig[app.id] = { ...appsConfig[app.id], active: false };
    updateState({ appsConfig });
  };

  return (
    <div className="flex min-h-full flex-col">
      <main className="flex-1 px-4 pb-6 pt-10">
        <StatusChip tone="pause">{t('proExpired.chip')}</StatusChip>
        <h1 className="mt-4 text-headline text-ink">{t('proExpired.title', { count: limit })}</h1>
        <p className="mb-5 mt-2 text-body-s text-muted">{t('proExpired.text', { count: limit })}</p>

        <fieldset>
          <legend className="sr-only">{t('proExpired.legend')}</legend>
          <List>
            {protectedApps.map((app) => {
              const checked = kept.includes(app.id);
              const disabled = !checked && kept.length >= limit;
              const hintId = `pro-expired-${app.id}`;
              return (
                <label
                  key={app.id}
                  className={`flex min-h-[72px] items-center gap-4 px-4 py-3 ${disabled ? 'opacity-[0.38]' : 'cursor-pointer active:bg-ink/[0.08]'}`}
                >
                  <AppTile app={app} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-title-s text-ink">{app.name}</span>
                    <span id={hintId} className="block text-body-s text-muted">
                      {t(checked ? 'proExpired.keeps' : 'proExpired.paused')}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    aria-label={app.name}
                    aria-describedby={hintId}
                    className="peer sr-only"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => setKept(checked ? kept.filter((id) => id !== app.id) : [...kept, app.id])}
                  />
                  <span
                    aria-hidden="true"
                    className={`flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-[6px] peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface ${checked ? 'bg-accent text-ground' : 'border-2 border-muted'}`}
                  >
                    {checked && <Check size={16} strokeWidth={2.5} />}
                  </span>
                </label>
              );
            })}
          </List>
        </fieldset>
        <p className="mt-2 px-1 text-caption text-muted">{t('proExpired.rest')}</p>
      </main>

      <footer className="sticky bottom-0 flex flex-col gap-1 border-t border-line bg-ground px-4 pb-6 pt-3">
        <p role="status" className="mb-2 text-label-s text-muted">
          {t('proExpired.count', { chosen: kept.length, count: limit })}
          {paused.length > 0 &&
            ` · ${t(paused.length === 1 ? 'proExpired.pausedOne' : 'proExpired.pausedMany', { names: pausedNames })}`}
        </p>
        <PrimaryButton onClick={continueWithFree} disabled={kept.length === 0}>
          {t('proExpired.continue')}
        </PrimaryButton>
        <TextButton
          onClick={() => {
            updateState(paywallFor('third_app'));
            navigate('paywall');
          }}
        >
          {t('proExpired.renew')}
        </TextButton>
      </footer>
    </div>
  );
}
