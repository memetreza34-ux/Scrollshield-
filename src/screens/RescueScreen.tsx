import { useState } from 'react';
import { Info, LifeBuoy } from 'lucide-react';
import { AppState, Screen, SUPPORTED_APPS } from '../types';
import { AppTile, Choice, Header, List, Page, PrimaryButton, Row, Section } from '../components/ui';
import { FOCUS_RING_INSET } from '../components/styles';
import { t } from '../i18n';
import { createFocusStartUpdate, getRunningFocusSession, minutesUntilClockTime } from '../lib/focus';
import { formatHour } from '../lib/format';
import { RunningSession } from './FocusScreens';

type Duration = '15' | '30' | '60' | 'until';
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * Rescue (docs/V1_MASTER_PLAN.md, 4.6): an emergency brake, not a rules
 * engine. Locks every protected app at once and cannot be ended early; only
 * an emergency unlock in the locked app opens one for a few minutes.
 */
export function RescueScreen({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const [duration, setDuration] = useState<Duration>('30');
  const [untilHour, setUntilHour] = useState(18);
  const running = getRunningFocusSession(state);
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);
  const minutes = duration === 'until' ? minutesUntilClockTime(untilHour, 0) : Number(duration);
  const label =
    duration === 'until' ? t('rescue.untilTime', { time: formatHour(untilHour) }) : t('time.minutes', { minutes });

  return (
    <Page>
      <Header title={t('rescue.title')} onBack={() => navigate('today')} />

      {running ? (
        <RunningSession state={state} updateState={updateState} navigate={navigate} />
      ) : (
        <>
          <div className="mb-6 flex items-start gap-3">
            <LifeBuoy size={24} strokeWidth={1.75} className="mt-1 flex-shrink-0 text-accent" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <h2 className="text-title text-ink">{t('rescue.question')}</h2>
              <p className="text-body-s text-muted">{t('rescue.subtitle')}</p>
            </div>
          </div>

          <Section title={t('rescue.howLong')} kind="title">
            <Choice<Duration>
              label={t('rescue.howLong')}
              value={duration}
              onChange={setDuration}
              options={[
                ...[15, 30, 60].map((value) => ({
                  value: String(value) as Duration,
                  label: t('time.minutes', { minutes: value }),
                })),
                { value: 'until' as const, label: t('rescue.until') },
              ]}
            />
            {duration === 'until' && (
              <label className="mt-3 flex flex-col gap-1 text-label-s text-muted">
                {t('commitment.customHour')}
                <select
                  value={untilHour}
                  onChange={(event) => setUntilHour(Number(event.target.value))}
                  className={`min-h-12 rounded-control border border-line bg-surface px-4 text-body text-ink ${FOCUS_RING_INSET}`}
                >
                  {HOURS.map((hour) => (
                    <option key={hour} value={hour}>
                      {formatHour(hour)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </Section>

          <Section title={t('rescue.locks')} kind="title">
            {protectedApps.length > 0 ? (
              <List>
                {protectedApps.map((app) => (
                  <Row key={app.id} leading={<AppTile app={app} />} label={app.name} strong />
                ))}
              </List>
            ) : (
              <p className="px-1 text-body-s text-muted">{t('focus.noApps')}</p>
            )}
          </Section>

          <p className="mb-6 flex items-start gap-2 px-1 text-body-s text-muted">
            <Info size={16} strokeWidth={2} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            {t('rescue.noEarlyEnd')}
          </p>

          <PrimaryButton
            disabled={protectedApps.length === 0}
            onClick={() => updateState(createFocusStartUpdate(state, minutes, Date.now(), { kind: 'rescue' }))}
          >
            {t('rescue.start', { duration: label })}
          </PrimaryButton>
        </>
      )}
    </Page>
  );
}
