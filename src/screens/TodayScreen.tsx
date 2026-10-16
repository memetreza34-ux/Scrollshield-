import { useState } from 'react';
import {
  ChevronRight,
  Lightbulb,
  LifeBuoy,
  Moon,
  Plus,
  RotateCcw,
  Shield,
  SquarePlay,
  Timer,
  TriangleAlert,
  Undo2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppState, FocusSession, PlatformDefinition, Screen, SUPPORTED_APPS } from '../types';
import {
  AppTile,
  EmptyState,
  InlineButton,
  List,
  Page,
  PrimaryButton,
  ProBadge,
  Row,
  SecondaryButton,
  Section,
  StatusChip,
} from '../components/ui';
import { BrakesCard, GoalCard, GoalSheet, ScreenTimeCard, StartHero, StartStatus } from '../components/StartParts';
import { FOCUS_RING_INSET, PRESSED } from '../components/styles';
import { MessageKey, t } from '../i18n';
import {
  AppDayMetrics,
  AppDayObservation,
  describeAppDay,
  getDayMarks,
  getDayMetrics,
  usualMinutesByNow,
} from '../lib/metrics';
import { canAddSchedule, hasPro, paywallFor } from '../lib/entitlements';
import { getRunningFocusSession } from '../lib/focus';
import { createSchedule, getActiveScheduleForApp, getNextSchedule } from '../lib/schedules';
import { formatClock, formatUntil, isCommitmentActive } from '../lib/commitment';
import { getLocalDateKey } from '../lib/appUtils';
import { formatHour, formatMinutes, joinNames } from '../lib/format';
import { getSuggestion, Suggestion } from '../lib/suggestions';
import { applyPreset } from '../lib/presets';
import { normalizeAppConfig } from '../lib/state';

type ScreenProps = {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
};

/** Without these two nothing can be interrupted (docs/V1_MASTER_PLAN.md, 4.1). */
const REQUIRED_PERMISSIONS: { key: 'usageAccess' | 'overlay'; title: MessageKey }[] = [
  { key: 'usageAccess', title: 'permission.usageAccess.title' },
  { key: 'overlay', title: 'permission.overlay.title' },
];

const OBSERVATION_ICONS: Record<AppDayObservation['kind'], { icon: LucideIcon; color: string }> = {
  reopens: { icon: RotateCcw, color: 'text-pause' },
  shortVideo: { icon: SquarePlay, color: 'text-muted' },
  abandoned: { icon: Undo2, color: 'text-muted' },
};

const CARD = 'rounded-surface border border-line bg-surface';

/** Heute (docs/V1_MASTER_PLAN.md, 4.2): is protection on, and what happened today. */
/**
 * "Start" (the "today" screen): how protection stands, what the day looked
 * like, what to do next – in that order, the important part on the first
 * screen. Sky and greeting at the top, then the daily goal, the day's
 * timeline and focus; below the fold one suggestion and the apps.
 */
export function TodayScreen({ state, updateState, navigate }: ScreenProps) {
  // From Date.now, the clock the focus logic reads too.
  const now = new Date(Date.now());
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);
  const isWeb = state.operatingSystem === 'web';
  const running = getRunningFocusSession(state);
  const [editingGoal, setEditingGoal] = useState(false);
  const missing = isWeb ? [] : REQUIRED_PERMISSIONS.filter((permission) => !state.permissions[permission.key]);
  const status: StartStatus = isWeb
    ? 'preview'
    : missing.length > 1
      ? 'off'
      : missing.length === 1
        ? 'limited'
        : 'active';
  const hero = (
    <StartHero
      now={now}
      status={status}
      onStatus={() => navigate(missing.length > 0 ? 'permissions' : 'protect')}
      navigate={navigate}
    />
  );

  if (protectedApps.length === 0) {
    return (
      <Page>
        {hero}
        {running && (
          <div className="mb-3">
            <RunningCard session={running} now={now} navigate={navigate} />
          </div>
        )}
        <EmptyState
          icon={Shield}
          title={t('today.noApps.title')}
          text={t('today.noApps.text')}
          action={<PrimaryButton onClick={() => navigate('protect')}>{t('today.noApps.action')}</PrimaryButton>}
        />
      </Page>
    );
  }

  const metrics = getDayMetrics(state);
  const runningEnd = running ? running.startTime + running.duration * 60_000 : null;
  const todayStats = state.dailyStats[getLocalDateKey(now)];
  const usageKnown = metrics.perApp.some((app) => app.usageMinutes !== null);
  const usedMinutes = metrics.perApp.reduce((sum, app) => sum + (app.usageMinutes ?? 0), 0);
  const usageMeasured = usageKnown || (!isWeb && state.permissions.usageAccess);
  const goal = state.settings.dailyGoalMinutes;
  const marks = getDayMarks(state.history, now);
  const moreApps = SUPPORTED_APPS.length > protectedApps.length;
  const suggestion = getSuggestion(state, now);
  const activeSchedule = state.schedules.find((schedule) =>
    protectedApps.some((app) => getActiveScheduleForApp([schedule], app.id, now)),
  );
  const shownSchedule = activeSchedule ?? getNextSchedule(state.schedules, now);

  const openRescue = () => {
    if (hasPro(state)) navigate('rescue');
    else {
      updateState(paywallFor('rescue'));
      navigate('paywall');
    }
  };

  const openApp = (appId: string) => {
    updateState({ selectedAppId: appId });
    navigate('app_detail');
  };

  /** The lock that applies to an app right now, as one line for its chip. */
  const lockFor = (appId: string) => {
    if (running && runningEnd !== null && running.protectedApps.includes(appId)) {
      return t(running.kind === 'rescue' ? 'today.app.lockedRescue' : 'today.app.lockedFocus', {
        time: formatClock(runningEnd),
      });
    }
    const schedule = getActiveScheduleForApp(state.schedules, appId, now);
    return schedule ? t('today.app.lockedSchedule', { time: formatHour(schedule.endHour), name: schedule.name }) : null;
  };

  const applySuggestion = (current: Suggestion) => {
    const action = current.action;
    if (action.kind === 'evening_schedule') {
      if (!canAddSchedule(state)) {
        updateState(paywallFor('second_schedule'));
        navigate('paywall');
        return;
      }
      const schedule = createSchedule([action.appId]);
      updateState({ schedules: [...state.schedules, schedule], selectedScheduleId: schedule.id });
      navigate('schedule_edit');
      return;
    }
    const config = normalizeAppConfig(action.appId, state.appsConfig[action.appId]);
    const next =
      action.kind === 'feed_limit'
        ? {
            ...config,
            reelsProtection: {
              ...config.reelsProtection,
              enabled: true,
              mode: 'limit' as const,
              dailyLimitMinutes: action.minutes,
            },
          }
        : applyPreset(config, 'ausgewogen');
    updateState({ appsConfig: { ...state.appsConfig, [action.appId]: next } });
  };

  const hideSuggestion = (id: string) =>
    updateState({ dismissedSuggestions: { ...state.dismissedSuggestions, [id]: getLocalDateKey(now) } });

  const commitment =
    isCommitmentActive(state) && state.commitment
      ? t('today.status.commitment', { until: formatUntil(state.commitment.until) })
      : null;

  return (
    <Page>
      {hero}

      {(missing.length > 0 || running) && (
        <div className="mb-6 flex flex-col gap-3">
          {missing.length > 0 && (
            <div role="alert" className="rise flex flex-col gap-4 rounded-surface bg-pause/10 p-4">
              <div className="flex items-start gap-3">
                <TriangleAlert size={24} strokeWidth={1.75} className="flex-shrink-0 text-pause" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-title-s text-ink">
                    {t(missing.length > 1 ? 'today.notActive.title' : 'today.limited.title')}
                  </p>
                  <p className="text-body-s text-ink">
                    {missing.length > 1
                      ? t('today.notActive.text')
                      : t('today.limited.text', { permission: t(missing[0].title) })}
                  </p>
                </div>
              </div>
              <PrimaryButton onClick={() => navigate('permissions')}>
                {t(missing.length > 1 ? 'today.notActive.action' : 'today.limited.action')}
              </PrimaryButton>
            </div>
          )}

          {running && (
            <div className="rise">
              <RunningCard session={running} now={now} navigate={navigate} />
            </div>
          )}
        </div>
      )}

      <div className="rise" style={{ animationDelay: '0.05s' }}>
        <Section title={t('start.section.screenTime')} kind="title">
          <ScreenTimeCard
            total={todayStats?.screenTimeMinutes}
            perHour={todayStats?.screenTimePerHour}
            socialPerHour={todayStats?.usagePerHour}
            usualByNow={usualMinutesByNow(state.dailyStats, now, 'screenTimePerHour')}
            topApps={todayStats?.topApps}
            protectedPackages={new Set(protectedApps.flatMap((app) => app.androidPackages))}
            unlocks={todayStats?.unlocks}
            firstUnlockAt={todayStats?.firstUnlockAt}
            isWeb={isWeb}
            now={now}
          />
        </Section>
      </div>

      <div className="rise" style={{ animationDelay: '0.12s' }}>
        <Section title={t('start.section.goal')} kind="title">
          <GoalCard
            used={usedMinutes}
            goal={goal}
            measured={usageMeasured}
            isWeb={isWeb}
            usualByNow={usualMinutesByNow(state.dailyStats, now)}
            onEdit={() => setEditingGoal(true)}
          />
        </Section>
      </div>

      <div className="rise" style={{ animationDelay: '0.18s' }}>
        <Section title={t('start.section.brakes')} kind="title">
          <BrakesCard marks={marks} now={now} />
        </Section>
      </div>

      <div className="mb-8 flex flex-col gap-3">
        {!running && (
          <div className="grid grid-cols-2 gap-3">
            {/* At most one green button: while permissions are missing, that is "Berechtigungen erteilen". */}
            {missing.length > 0 ? (
              <SecondaryButton onClick={() => navigate('focus')}>
                <Timer size={20} strokeWidth={1.75} aria-hidden="true" />
                {t('today.startFocus')}
              </SecondaryButton>
            ) : (
              <PrimaryButton onClick={() => navigate('focus')}>
                <Timer size={20} strokeWidth={1.75} aria-hidden="true" />
                {t('today.startFocus')}
              </PrimaryButton>
            )}
            <SecondaryButton onClick={openRescue}>
              <LifeBuoy size={20} strokeWidth={1.75} aria-hidden="true" />
              {t('today.rescue')}
              {!hasPro(state) && <ProBadge />}
            </SecondaryButton>
          </div>
        )}

        {commitment && <p className="px-1 text-body-s text-muted">{commitment}</p>}
      </div>

      {suggestion && (
        <div className={`mb-8 flex flex-col gap-3 p-5 ${CARD}`}>
          <p className="flex items-center gap-2 text-label-s text-pause">
            <Lightbulb size={16} strokeWidth={2} aria-hidden="true" />
            {t('today.suggestion')}
          </p>
          <p className="text-body text-ink">{suggestion.text}</p>
          <div className="flex flex-wrap items-center gap-2">
            <InlineButton onClick={() => applySuggestion(suggestion)}>{suggestion.actionLabel}</InlineButton>
            <button
              onClick={() => hideSuggestion(suggestion.id)}
              className={`min-h-12 rounded-control px-3 text-label text-muted ${PRESSED} ${FOCUS_RING_INSET}`}
            >
              {t('today.suggestion.hide')}
            </button>
          </div>
        </div>
      )}

      <Section title={t('start.apps')} kind="title">
        <List>
          {protectedApps.map((app) => (
            <AppDayRow
              key={app.id}
              app={app}
              metrics={metrics.perApp.find((entry) => entry.appId === app.id)}
              lock={lockFor(app.id)}
              shortVideoUnmeasured={
                !isWeb &&
                !state.permissions.accessibility &&
                !!app.shortVideoSurface &&
                !!state.appsConfig[app.id]?.reelsProtection?.enabled
              }
              onClick={() => openApp(app.id)}
            />
          ))}
          {moreApps && (
            <Row
              leading={
                <span className="flex h-10 w-10 items-center justify-center rounded-control border border-dashed border-line text-muted">
                  <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
              }
              label={t('start.apps.add')}
              onClick={() => navigate('protect')}
            />
          )}
        </List>
      </Section>

      {shownSchedule && (
        <Section title={t('today.next')} kind="title">
          <button
            onClick={() => navigate('protect')}
            className={`flex min-h-[72px] w-full items-center gap-4 px-4 py-3 text-left ${CARD} ${PRESSED} ${FOCUS_RING_INSET}`}
          >
            <Moon size={24} strokeWidth={1.75} className="flex-shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-title-s text-ink">
                {shownSchedule === activeSchedule
                  ? t('today.next.running', { name: shownSchedule.name })
                  : t('today.next.from', { time: formatHour(shownSchedule.startHour), name: shownSchedule.name })}
              </span>
              <span className="block text-body-s text-muted">
                {t('today.next.blocked', {
                  apps: joinNames(
                    SUPPORTED_APPS.filter((app) => shownSchedule.appIds.includes(app.id)).map((app) => app.name),
                    'and',
                  ),
                  time: formatHour(shownSchedule.endHour),
                })}
              </span>
            </span>
            <ChevronRight size={20} strokeWidth={1.75} className="flex-shrink-0 text-muted" aria-hidden="true" />
          </button>
        </Section>
      )}

      {editingGoal && (
        <GoalSheet
          goal={goal}
          onChange={(minutes) => updateState({ settings: { ...state.settings, dailyGoalMinutes: minutes } })}
          onClose={() => setEditingGoal(false)}
        />
      )}

      {isWeb && (
        <Section title={t('today.try')}>
          <List>
            {protectedApps.map((app) => (
              <Row
                key={app.id}
                leading={<AppTile app={app} size="sm" />}
                label={t('today.try.open', { app: app.name })}
                onClick={() => {
                  updateState({ simulatedAppToOpen: app.id });
                  navigate('protection_flow');
                }}
              />
            ))}
          </List>
        </Section>
      )}
    </Page>
  );
}

/** A running focus or rescue: protection, so green; the red lock shows at the apps. */
function RunningCard({ session, now, navigate }: { session: FocusSession; now: Date; navigate: (s: Screen) => void }) {
  const end = session.startTime + session.duration * 60_000;
  const Icon = session.kind === 'rescue' ? LifeBuoy : Timer;
  return (
    <div className={`flex items-center gap-3 p-4 ${CARD}`}>
      <Icon size={24} strokeWidth={1.75} className="flex-shrink-0 text-accent" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-title-s text-ink">
          {t(session.kind === 'rescue' ? 'today.running.rescue' : 'today.running.focus')}
        </p>
        <p className="text-body-s text-muted">
          {t('today.running.remaining', {
            minutes: Math.max(0, Math.ceil((end - now.getTime()) / 60_000)),
            time: formatClock(end),
          })}
        </p>
      </div>
      <InlineButton onClick={() => navigate(session.kind === 'rescue' ? 'rescue' : 'focus')}>
        {t('today.running.view')}
      </InlineButton>
    </div>
  );
}

/** A whole-width tappable line with an arrow: "2 Apps geschützt ›". */
/** One protected app's day: what was measured, what applies now, one observation. */
function AppDayRow({
  app,
  metrics,
  lock,
  shortVideoUnmeasured,
  onClick,
}: {
  app: PlatformDefinition;
  metrics: AppDayMetrics | undefined;
  lock: string | null;
  shortVideoUnmeasured: boolean;
  onClick: () => void;
}) {
  const opens = metrics?.opens ?? 0;
  const interruptions = metrics?.interruptions ?? 0;
  const summary =
    opens + interruptions === 0
      ? t('today.app.notOpened')
      : [
          metrics?.usageMinutes !== null && metrics?.usageMinutes !== undefined
            ? formatMinutes(metrics.usageMinutes)
            : null,
          opens === 1 ? t('today.app.opensOne') : t('today.app.opensMany', { count: opens }),
          interruptions > 0 ? t('today.app.interrupted', { count: interruptions }) : null,
        ]
          .filter(Boolean)
          .join(' · ');
  const observation = metrics ? describeAppDay(metrics) : null;
  const ObservationIcon = observation ? OBSERVATION_ICONS[observation.kind].icon : SquarePlay;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-4 px-4 py-3.5 text-left ${PRESSED} ${FOCUS_RING_INSET}`}
    >
      <AppTile app={app} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="min-w-0 text-title-s text-ink">{app.name}</span>
        <span className="text-body-s text-muted">{summary}</span>
        {lock && (
          <span className="mt-1 flex">
            <StatusChip tone="lock">{lock}</StatusChip>
          </span>
        )}
        {(observation || shortVideoUnmeasured) && (
          <span className={`mt-1 flex items-start gap-1.5 text-body-s ${observation ? 'text-ink' : 'text-muted'}`}>
            <ObservationIcon
              size={16}
              strokeWidth={2}
              className={`mt-0.5 flex-shrink-0 ${observation ? OBSERVATION_ICONS[observation.kind].color : 'text-muted'}`}
              aria-hidden="true"
            />
            {observation ? observation.text : t('today.app.shortVideoNotMeasured')}
          </span>
        )}
      </span>
    </button>
  );
}

/** Screen time of the whole phone, measured by Android; in the browser there is none. */
