import { useEffect, useRef, useState } from 'react';
import { CircleCheck, LifeBuoy, LockKeyhole, Timer, TriangleAlert } from 'lucide-react';
import { AppState, FocusSession, Screen, SUPPORTED_APPS } from '../types';
import {
  AppTile,
  Choice,
  InlineButton,
  List,
  Notice,
  Page,
  PrimaryButton,
  ProBadge,
  Row,
  SecondaryButton,
  Section,
  Sheet,
  StatusChip,
  Switch,
  TabHeader,
  TextButton,
} from '../components/ui';
import { MessageKey, t } from '../i18n';
import { createFocusEndUpdate, createFocusStartUpdate, getRunningFocusSession } from '../lib/focus';
import { FREE_LIMITS, hasPro, paywallFor, ProFeature } from '../lib/entitlements';
import { formatClock } from '../lib/commitment';
import { formatMinutes, joinNames } from '../lib/format';

type ScreenProps = {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
};

const CARD = 'rounded-surface border border-line bg-surface';
const CUSTOM_DURATIONS = [10, 20, 45, 90, 120];
const REQUIRED: { key: 'usageAccess' | 'overlay'; title: MessageKey }[] = [
  { key: 'usageAccess', title: 'permission.usageAccess.title' },
  { key: 'overlay', title: 'permission.overlay.title' },
];

/** Remaining time of the running session, ticking every second. */
function useRemainingSeconds(endTime: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (endTime === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [endTime]);
  return endTime === null ? 0 : Math.max(0, Math.round((endTime - now) / 1000));
}

/** "18:42" or "1:05:00" – the countdown counts calmly in seconds. */
const formatSeconds = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = (seconds % 60).toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
};

/** Interruptions of the session's apps since it started (and until it ended). */
const interruptionsDuring = (state: AppState, session: FocusSession) =>
  state.history.filter(
    (event) =>
      event.timestamp >= session.startTime &&
      (session.endTime === null || event.timestamp <= session.endTime) &&
      (event.type === 'block' || event.type === 'warning') &&
      session.protectedApps.includes(event.appId ?? ''),
  ).length;

const appNames = (session: FocusSession) =>
  joinNames(
    SUPPORTED_APPS.filter((app) => session.protectedApps.includes(app.id)).map((app) => app.name),
    'and',
  );

/** The view of a running focus or rescue session: time left, what is locked, how to end it. */
export function RunningSession({ state, updateState, navigate }: ScreenProps) {
  const session = getRunningFocusSession(state);
  const endTime = session ? session.startTime + session.duration * 60_000 : null;
  const remaining = useRemainingSeconds(endTime);
  const [confirmEnd, setConfirmEnd] = useState(false);
  if (!session || endTime === null) return null;

  const isRescue = session.kind === 'rescue';
  const apps = SUPPORTED_APPS.filter((app) => session.protectedApps.includes(app.id));
  const interrupted = interruptionsDuring(state, session);
  const end = formatClock(endTime);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center pb-8 pt-4 text-center">
        <StatusChip tone="accent">{t(isRescue ? 'today.running.rescue' : 'today.running.focus')}</StatusChip>
        <p role="timer" className="mt-6 text-display text-ink">
          {formatSeconds(remaining)}
        </p>
        <p className="mt-1 text-body-s text-muted">{t('focus.endsAt', { time: end })}</p>
      </div>

      <Section title={t('focus.lockedUntil', { time: end })}>
        <List>
          {apps.map((app) => (
            <Row
              key={app.id}
              leading={<AppTile app={app} />}
              label={app.name}
              strong
              trailing={<LockKeyhole size={20} strokeWidth={1.75} className="text-muted" aria-hidden="true" />}
            />
          ))}
        </List>
      </Section>

      <p className="mb-6 px-1 text-body-s text-muted">
        {interrupted === 0
          ? t('focus.interruptedNone')
          : interrupted === 1
            ? t('focus.interruptedOne')
            : t('focus.interruptedMany', { count: interrupted })}
      </p>

      {session.strict || isRescue ? (
        <p className="text-center text-body-s text-muted">{t(isRescue ? 'focus.rescueNoEnd' : 'focus.strictNoEnd')}</p>
      ) : (
        <SecondaryButton onClick={() => setConfirmEnd(true)}>{t('focus.end')}</SecondaryButton>
      )}

      {confirmEnd && (
        <Sheet title={t('focus.endQuestion')} onClose={() => setConfirmEnd(false)}>
          <p className="mt-2 text-body text-muted">
            {t('focus.endText', { minutes: Math.ceil(remaining / 60), apps: appNames(session) })}
          </p>
          <div className="mt-6 flex flex-col gap-1">
            <PrimaryButton onClick={() => setConfirmEnd(false)}>{t('focus.keepGoing')}</PrimaryButton>
            <TextButton
              onClick={() => {
                updateState(createFocusEndUpdate(state, false));
                navigate('today');
              }}
            >
              {t('focus.end')}
            </TextButton>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** A focus ran out: short and factual. No confetti. */
function FocusFinished({ state, session, onDone }: { state: AppState; session: FocusSession; onDone: () => void }) {
  const interrupted = interruptionsDuring(state, session);
  const stats: [MessageKey, string][] = [
    ['focus.stat.duration', formatMinutes(session.duration)],
    ['focus.stat.interrupted', String(interrupted)],
    ['focus.stat.end', formatClock(session.endTime ?? Date.now())],
  ];
  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center pb-6 pt-4 text-center">
        <CircleCheck size={40} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
        <h2 className="mt-4 text-headline text-ink">{t('focus.finished')}</h2>
        <p className="mt-1 text-body-s text-muted">
          {interrupted === 1
            ? t('focus.finishedOne', { duration: formatMinutes(session.duration) })
            : t('focus.finishedMany', { duration: formatMinutes(session.duration), count: interrupted })}
        </p>
      </div>
      <dl className={`mb-4 grid grid-cols-3 divide-x divide-line ${CARD}`}>
        {stats.map(([label, value]) => (
          <div key={label} className="flex flex-col-reverse items-center gap-1 px-2 py-4 text-center">
            <dt className="text-caption text-muted">{t(label)}</dt>
            <dd className="text-title text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mb-6 px-1 text-body-s text-muted">{t('focus.finishedFree', { apps: appNames(session) })}</p>
      <PrimaryButton onClick={onDone}>{t('focus.done')}</PrimaryButton>
    </div>
  );
}

type DurationChoice = '15' | '30' | '60' | 'custom';

/** Fokus (docs/V1_MASTER_PLAN.md, 4.4). */
export function Focus({ state, updateState, navigate }: ScreenProps) {
  const pro = hasPro(state);
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);
  const [duration, setDuration] = useState<number>(30);
  const [appIds, setAppIds] = useState<string[]>(protectedApps.map((app) => app.id));
  const [strict, setStrict] = useState(false);
  const running = getRunningFocusSession(state);

  // A session that ran out while this tab was open gets its summary.
  const [finished, setFinished] = useState<FocusSession | null>(null);
  const runningId = running?.id ?? null;
  const previousRunningId = useRef(runningId);
  useEffect(() => {
    const previous = previousRunningId.current;
    previousRunningId.current = runningId;
    if (!previous || runningId) return;
    const ended = state.focusSessions.find((session) => session.id === previous);
    if (ended?.successful && ended.kind !== 'rescue') setFinished(ended);
  }, [runningId, state.focusSessions]);

  const paywall = (feature: ProFeature) => {
    updateState(paywallFor(feature));
    navigate('paywall');
  };

  if (running || finished) {
    return (
      <Page>
        <TabHeader title={t('nav.focus')} navigate={navigate} />
        {running ? (
          <RunningSession state={state} updateState={updateState} navigate={navigate} />
        ) : (
          finished && <FocusFinished state={state} session={finished} onDone={() => setFinished(null)} />
        )}
      </Page>
    );
  }

  const missing = state.operatingSystem === 'android' ? REQUIRED.filter((item) => !state.permissions[item.key]) : [];
  const freeDurations = FREE_LIMITS.focusDurations as readonly number[];
  const durationChoice: DurationChoice = freeDurations.includes(duration)
    ? (String(duration) as DurationChoice)
    : 'custom';

  return (
    <Page>
      <TabHeader title={t('nav.focus')} navigate={navigate} />
      <p className="mb-5 text-body-s text-muted">{t('focus.intro')}</p>

      {missing.length > 0 && (
        <div className="mb-5">
          <Notice
            tone="pause"
            icon={TriangleAlert}
            title={t('focus.cannotBlock')}
            action={<InlineButton onClick={() => navigate('permissions')}>{t('focus.fix')}</InlineButton>}
          >
            {missing.length === 1 ? t('focus.missingOne', { permission: t(missing[0].title) }) : t('focus.missingMany')}
          </Notice>
        </div>
      )}

      <Section title={t('focus.duration')} kind="title">
        <Choice<DurationChoice>
          label={t('focus.duration')}
          value={durationChoice}
          onChange={(choice) => {
            if (choice !== 'custom') setDuration(Number(choice));
            else if (!pro) paywall('custom_focus');
            else setDuration(CUSTOM_DURATIONS[2]);
          }}
          options={[
            ...freeDurations.map((minutes) => ({
              value: String(minutes) as DurationChoice,
              label: t('time.minutes', { minutes }),
            })),
            { value: 'custom' as const, label: t('common.custom'), pro: !pro },
          ]}
        />
        {durationChoice === 'custom' && (
          <div className="mt-3">
            <Choice<number>
              label={t('focus.customDuration')}
              value={duration}
              onChange={setDuration}
              options={CUSTOM_DURATIONS.map((minutes) => ({ value: minutes, label: t('time.minutes', { minutes }) }))}
            />
          </div>
        )}
      </Section>

      <Section title={t('focus.apps')} kind="title">
        {protectedApps.length > 0 ? (
          <List>
            {protectedApps.map((app) => (
              <Row
                key={app.id}
                leading={<AppTile app={app} />}
                label={app.name}
                strong
                right={
                  <Switch
                    checked={appIds.includes(app.id)}
                    ariaLabel={t('focus.lockApp', { app: app.name })}
                    onChange={(checked) =>
                      setAppIds((previous) =>
                        checked ? [...previous, app.id] : previous.filter((id) => id !== app.id),
                      )
                    }
                  />
                }
              />
            ))}
          </List>
        ) : (
          <p className="px-1 text-body-s text-muted">{t('focus.noApps')}</p>
        )}
      </Section>

      <Section>
        <List>
          <Row
            label={t('focus.strict')}
            description={t('focus.strictText')}
            pro={!pro}
            right={
              <Switch
                checked={strict}
                ariaLabel={t('focus.strict')}
                onChange={(checked) => (pro ? setStrict(checked) : paywall('strict_focus'))}
              />
            }
          />
        </List>
      </Section>

      <PrimaryButton
        disabled={appIds.length === 0 || missing.length > 0}
        onClick={() => updateState(createFocusStartUpdate(state, duration, Date.now(), { appIds, strict }))}
      >
        <Timer size={20} strokeWidth={1.75} aria-hidden="true" />
        {t('focus.start', { duration: t('time.minutes', { minutes: duration }) })}
      </PrimaryButton>
      {missing.length > 0 && <p className="mt-2 text-center text-caption text-muted">{t('focus.startLater')}</p>}

      <div className="mt-10">
        <Section title={t('focus.rescue')} kind="title" action={!pro && <ProBadge />}>
          <div className={`flex flex-col gap-3 p-4 ${CARD}`}>
            <p className="flex items-start gap-3 text-body-s text-muted">
              <LifeBuoy size={20} strokeWidth={1.75} className="mt-0.5 flex-shrink-0 text-ink" aria-hidden="true" />
              {t('focus.rescueText')}
            </p>
            <div>
              <InlineButton onClick={() => (pro ? navigate('rescue') : paywall('rescue'))}>
                {t('focus.rescueOpen')}
              </InlineButton>
            </div>
          </div>
        </Section>
      </div>
    </Page>
  );
}
