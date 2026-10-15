import { useCallback, useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { AppState, HistoryEvent, Screen, SUPPORTED_APPS } from '../types';
import { createEventId } from '../lib/appUtils';
import {
  countEmergencyUnlocksToday,
  evaluateProtectionAttempt,
  getAppUsageMinutesToday,
  ProtectionBlockReason,
  ProtectionFlowStep,
} from '../lib/protectionRules';
import { getActiveScheduleForApp } from '../lib/schedules';
import { getFocusBlockedAppIds, getRunningFocusSession } from '../lib/focus';
import { formatClock, isCommitmentActive } from '../lib/commitment';
import { recordProtectionEventStats } from '../lib/session';
import { formatHour, formatMinutesSeconds } from '../lib/format';
import { MessageKey, t } from '../i18n';
import { Choice, PrimaryButton, Sheet, TextButton } from '../components/ui';
import {
  BackAction,
  ContinueAction,
  Countdown,
  EmergencyLink,
  InterruptionScreen,
  PauseLine,
  ReopenStages,
} from '../components/Interruption';

type EmergencyReason = 'work' | 'message' | 'other';
const EMERGENCY_REASONS: Record<EmergencyReason, MessageKey> = {
  work: 'emergency.reason.work',
  message: 'emergency.reason.message',
  other: 'emergency.reason.other',
};
/** Plan 4.8: wait 10 seconds, then the app is free for a few minutes. */
const EMERGENCY_WAIT_SECONDS = 10;

/** Ticks once a second while `active`, so locks with an end time count down. */
function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [active]);
  return now;
}

export function ProtectionFlow({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const appId = state.simulatedAppToOpen;
  const appInfo = SUPPORTED_APPS.find((app) => app.id === appId);
  const config = state.appsConfig[appId || ''];

  const [step, setStep] = useState<ProtectionFlowStep>('init');
  const [blockReason, setBlockReason] = useState<ProtectionBlockReason | undefined>();
  const [delayRemaining, setDelayRemaining] = useState(0);
  const [intentReason, setIntentReason] = useState('');
  const [intentDuration, setIntentDuration] = useState(5);
  const [sessionLimitOverrideMinutes, setSessionLimitOverrideMinutes] = useState<number | undefined>();
  const [emergency, setEmergency] = useState<'reason' | 'waiting' | 'free' | null>(null);
  const [emergencyReason, setEmergencyReason] = useState<EmergencyReason | null>(null);
  const [emergencyWait, setEmergencyWait] = useState(EMERGENCY_WAIT_SECONDS);

  const logEvent = useCallback(
    (type: HistoryEvent['type'], desc: string, metadata?: HistoryEvent['metadata']) => {
      if (!appId) return;

      const newEvent: HistoryEvent = {
        id: createEventId(),
        timestamp: Date.now(),
        type,
        appId,
        desc,
        ...(metadata ? { metadata } : {}),
      };
      updateState({
        history: [newEvent, ...state.history],
        dailyStats: recordProtectionEventStats(state.dailyStats, type, newEvent.timestamp),
      });
    },
    [appId, state.dailyStats, state.history, updateState],
  );

  const openApp = useCallback(
    (durationOverride?: number, reason?: string) => {
      setSessionLimitOverrideMinutes(durationOverride);

      // The stated intention used to be discarded the moment the app opened.
      // Keeping it is what makes the question more than a formality: it turns
      // up in the history and feeds the "why do you open this" insight.
      const trimmedReason = reason?.trim();
      logEvent(
        'open',
        trimmedReason ? `App geöffnet: ${trimmedReason}` : 'App geöffnet',
        trimmedReason ? { intentReason: trimmedReason, intentDurationMinutes: durationOverride } : undefined,
      );
      setStep('app_opened');
    },
    [logEvent],
  );

  const cancel = () => {
    updateState({ simulatedAppToOpen: null });
    navigate('today');
  };

  useEffect(() => {
    if (!appId || !appInfo || !config) {
      navigate('today');
      return;
    }

    if (step !== 'init') return;

    const decision = evaluateProtectionAttempt({
      appId,
      config,
      dailyStats: state.dailyStats,
      history: state.history,
      isFocusModeActive: state.isFocusModeActive,
      focusBlockedAppIds: getFocusBlockedAppIds({
        focusSessions: state.focusSessions,
        isFocusModeActive: state.isFocusModeActive,
      }),
      schedules: state.schedules,
    });

    if (decision.delaySeconds !== undefined) setDelayRemaining(decision.delaySeconds);
    setBlockReason(decision.blockReason);

    if (decision.event) {
      logEvent(decision.event.type, decision.event.desc);
    }

    if (decision.step === 'app_opened') {
      openApp();
      return;
    }

    setStep(decision.step);
  }, [
    appId,
    appInfo,
    config,
    logEvent,
    navigate,
    openApp,
    state.dailyStats,
    state.history,
    state.isFocusModeActive,
    state.focusSessions,
    state.schedules,
    step,
  ]);

  const pausing = step === 'standard_delay' || step === 'anti_binge_warning';
  useEffect(() => {
    if (!pausing || delayRemaining <= 0) return;
    const interval = setInterval(() => setDelayRemaining((previous) => Math.max(0, previous - 1)), 1000);
    return () => clearInterval(interval);
  }, [pausing, delayRemaining]);

  useEffect(() => {
    if (emergency !== 'waiting') return;
    if (emergencyWait <= 0) {
      setEmergency('free');
      return;
    }
    const timeout = setTimeout(() => setEmergencyWait((previous) => previous - 1), 1000);
    return () => clearTimeout(timeout);
  }, [emergency, emergencyWait]);

  const runningSession = getRunningFocusSession(state);
  const now = useNow(step === 'strict_blocked' || (step === 'anti_binge_block' && blockReason === 'anti_binge'));

  if (!appInfo || !config) return null;
  const app = appInfo.name;

  // No emergency unlock during a self-commitment or a strict focus; Rescue allows it (plan 4.6).
  const strictFocus = state.isFocusModeActive && runningSession?.strict && runningSession.kind !== 'rescue';
  const emergencyUsed = countEmergencyUnlocksToday(state.history);
  const emergencyMax = config.emergencyUnlock?.maxPerDay ?? 0;
  const emergencyLeft = Math.max(0, emergencyMax - emergencyUsed);
  const emergencyMinutes = config.emergencyUnlock?.durationMinutes ?? 5;
  const emergencyOffered =
    !isCommitmentActive(state) && !strictFocus && (config.emergencyUnlock?.enabled || state.isFocusModeActive);
  const emergencyLink = emergencyOffered && emergencyLeft > 0 && (
    <EmergencyLink
      onClick={() => {
        setEmergencyReason(null);
        setEmergency('reason');
      }}
    />
  );
  const back = <BackAction label={t('pause.back')} onClick={cancel} />;

  const emergencySheet = emergency === 'reason' && (
    <Sheet title={t('interrupt.emergency')} onClose={() => setEmergency(null)}>
      <p className="mb-3 mt-1 text-body text-muted">{t('emergency.question', { app })}</p>
      <Choice<EmergencyReason>
        label={t('emergency.question', { app })}
        value={emergencyReason ?? ('' as EmergencyReason)}
        onChange={setEmergencyReason}
        options={(Object.keys(EMERGENCY_REASONS) as EmergencyReason[]).map((reason) => ({
          value: reason,
          label: t(EMERGENCY_REASONS[reason]),
        }))}
      />
      <p className="mt-4 flex items-start gap-2 text-body-s text-ink">
        <Info size={16} strokeWidth={2} className="mt-0.5 flex-shrink-0 text-muted" aria-hidden="true" />
        {t('emergency.info', { app, minutes: emergencyMinutes, count: emergencyLeft })}
      </p>
      <div className="mt-6 flex flex-col gap-1">
        <PrimaryButton
          disabled={!emergencyReason}
          onClick={() => {
            setEmergencyWait(EMERGENCY_WAIT_SECONDS);
            setEmergency('waiting');
          }}
        >
          {t('common.continue')}
        </PrimaryButton>
        <TextButton onClick={() => setEmergency(null)}>{t('commitment.confirm.cancel')}</TextButton>
      </div>
    </Sheet>
  );

  if (emergency === 'waiting' && emergencyReason) {
    return (
      <InterruptionScreen
        app={appInfo}
        chip={t('emergency.chip', { reason: t(EMERGENCY_REASONS[emergencyReason]) })}
        tone="pause"
        title={t('emergency.wait.title', { app, minutes: emergencyMinutes })}
        text={t('emergency.wait.text')}
        footer={
          <>
            <BackAction label={t('emergency.wait.cancel')} onClick={cancel} />
            <p className="text-center text-caption text-muted">{t('emergency.wait.caption', { app })}</p>
          </>
        }
      >
        <Countdown value={emergencyWait} label={t('pause.seconds')} />
      </InterruptionScreen>
    );
  }

  if (emergency === 'free' && emergencyReason) {
    return (
      <InterruptionScreen
        app={appInfo}
        chip={t('emergency.free.chip', { time: formatClock(Date.now() + emergencyMinutes * 60_000) })}
        tone="accent"
        title={t('emergency.free.title', { app, minutes: emergencyMinutes })}
        text={t('emergency.free.text')}
        footer={
          <>
            <PrimaryButton
              onClick={() => {
                logEvent('emergency', `Notfallfreigabe (${emergencyMinutes}m): ${emergencyReason}`, {
                  reason: emergencyReason,
                });
                setSessionLimitOverrideMinutes(emergencyMinutes);
                setEmergency(null);
                setStep('app_opened');
              }}
            >
              {t('emergency.free.open', { app })}
            </PrimaryButton>
            <TextButton onClick={cancel}>{t('emergency.free.cancel')}</TextButton>
          </>
        }
      >
        <p className="text-body-s text-muted">{t('emergency.free.remaining', { count: emergencyLeft - 1 })}</p>
      </InterruptionScreen>
    );
  }

  if (step === 'soft_intent') {
    return (
      <InterruptionScreen
        app={appInfo}
        chip={t('interrupt.intent.chip')}
        tone="pause"
        title={t('interrupt.intent.title', { app })}
        footer={
          <>
            <BackAction label={t('pause.back')} onClick={cancel} />
            <ContinueAction label={t('common.continue')} onClick={() => openApp(intentDuration, intentReason)} />
          </>
        }
      >
        <div className="mt-2 flex w-full flex-col gap-4 text-left">
          <label className="flex flex-col gap-1 text-label-s text-muted">
            {t('interrupt.intent.reason')}
            <input
              type="text"
              value={intentReason}
              onChange={(event) => setIntentReason(event.target.value)}
              className="min-h-12 rounded-control border border-line bg-surface px-4 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <Choice<number>
            label={t('interrupt.intent.duration')}
            value={intentDuration}
            onChange={setIntentDuration}
            options={[5, 10, 15].map((minutes) => ({ value: minutes, label: t('time.minutes', { minutes }) }))}
          />
        </div>
      </InterruptionScreen>
    );
  }

  if (pausing) {
    const longer = step === 'anti_binge_warning';
    const done = delayRemaining <= 0;
    const lastOpen = state.history
      .filter((event) => event.appId === appInfo.id && event.type === 'open')
      .reduce((latest, event) => Math.max(latest, event.timestamp), 0);
    const minutesAgo = lastOpen > 0 ? Math.max(1, Math.round((Date.now() - lastOpen) / 60_000)) : null;
    const proceed = () => (config.mode === 'standard' ? openApp() : setStep('soft_intent'));

    return (
      <InterruptionScreen
        app={appInfo}
        chip={t(done ? 'interrupt.pause.done' : longer ? 'interrupt.stage.longer' : 'interrupt.stage.pause')}
        tone={done ? 'accent' : 'pause'}
        title={
          longer
            ? minutesAgo
              ? t('interrupt.longer.title', { app, minutes: minutesAgo })
              : t('interrupt.longer.titleRecent', { app })
            : t('pause.title', { app })
        }
        text={t(done ? 'interrupt.pause.decide' : longer ? 'interrupt.longer.text' : 'interrupt.pause.text')}
        footer={
          <>
            {back}
            <ContinueAction
              label={done ? t('interrupt.continueTo', { app }) : t('interrupt.continueIn', { seconds: delayRemaining })}
              disabled={!done}
              onClick={proceed}
            />
          </>
        }
      >
        <PauseLine line={state.settings.pauseLine} />
        {!done && <Countdown value={delayRemaining} label={t('pause.seconds')} />}
        {longer && <ReopenStages stage={2} />}
      </InterruptionScreen>
    );
  }

  if (step === 'anti_binge_block') {
    if (blockReason === 'anti_binge') {
      const timeframe = config.antiBinge.blockTimeframe;
      const opens = state.history
        .filter(
          (event) => event.appId === appInfo.id && event.type === 'open' && event.timestamp >= now - timeframe * 60_000,
        )
        .map((event) => event.timestamp);
      const freeAt = (opens.length > 0 ? Math.min(...opens) : now) + timeframe * 60_000;
      const left = Math.max(0, freeAt - now);
      return (
        <>
          <InterruptionScreen
            app={appInfo}
            chip={t('interrupt.stage.cooldown')}
            tone="pause"
            title={t('interrupt.cooldown.title', { app, minutes: Math.max(1, Math.ceil(left / 60_000)) })}
            text={t('interrupt.cooldown.text', { app, minutes: timeframe, count: opens.length })}
            footer={
              <>
                {back}
                {emergencyLink}
              </>
            }
          >
            <Countdown
              value={formatMinutesSeconds(left / 1000)}
              label={t('interrupt.freeAt', { time: formatClock(freeAt) })}
            />
            <ReopenStages stage={3} />
          </InterruptionScreen>
          {emergencySheet}
        </>
      );
    }

    const schedule = blockReason === 'time_window' ? getActiveScheduleForApp(state.schedules, appInfo.id) : undefined;
    const lock =
      blockReason === 'daily_limit'
        ? {
            chip: t('interrupt.chip.budget'),
            title: t('interrupt.budget.title', { app }),
            text: t('interrupt.budget.text', {
              used: Math.round(getAppUsageMinutesToday(state.dailyStats, appInfo.id)),
              limit: config.dailyLimit,
              app,
            }),
          }
        : blockReason === 'time_window'
          ? {
              chip: t('interrupt.chip.schedule'),
              title: t('interrupt.schedule.title', {
                name: schedule?.name ?? '',
                time: formatHour(schedule?.endHour ?? 0),
              }),
              text: t('interrupt.schedule.text', { time: formatHour(schedule?.endHour ?? 0), app }),
            }
          : { chip: t('interrupt.chip.locked'), title: t('interrupt.limit.title', { app }), text: undefined };

    return (
      <>
        <InterruptionScreen
          app={appInfo}
          chip={lock.chip}
          tone="lock"
          title={lock.title}
          text={lock.text}
          footer={
            <>
              {back}
              {blockReason !== 'emergency_limit' && emergencyLink}
              {(blockReason === 'emergency_limit' || (emergencyOffered && emergencyLeft === 0)) && (
                <p className="flex items-center justify-center gap-2 text-body-s text-muted">
                  <Info size={16} strokeWidth={2} aria-hidden="true" />
                  {t('interrupt.emergencyUsed', { count: emergencyUsed })}
                </p>
              )}
            </>
          }
        />
        {emergencySheet}
      </>
    );
  }

  if (step === 'strict_blocked') {
    const end = runningSession ? runningSession.startTime + runningSession.duration * 60_000 : null;
    const isRescue = runningSession?.kind === 'rescue';
    const locked =
      state.isFocusModeActive && end !== null
        ? {
            chip: t(isRescue ? 'interrupt.chip.rescue' : 'interrupt.chip.focus'),
            title: t(isRescue ? 'interrupt.rescue.title' : 'interrupt.focus.title', {
              minutes: Math.max(1, Math.ceil((end - now) / 60_000)),
            }),
            text: isRescue
              ? t('interrupt.rescue.text', { time: formatClock(end) })
              : t('interrupt.focus.text', { app, time: formatClock(end) }),
          }
        : {
            chip: t('interrupt.chip.locked'),
            title: t('interrupt.strict.title', { app }),
            text: t('interrupt.strict.text'),
          };

    return (
      <>
        <InterruptionScreen
          app={appInfo}
          chip={locked.chip}
          tone="lock"
          title={locked.title}
          text={locked.text}
          footer={
            <>
              {back}
              {emergencyLink}
            </>
          }
        >
          {end !== null && state.isFocusModeActive && (
            <Countdown value={formatMinutesSeconds((end - now) / 1000)} label={t('interrupt.remaining')} />
          )}
        </InterruptionScreen>
        {emergencySheet}
      </>
    );
  }

  if (step === 'app_opened') {
    return (
      <InterruptionScreen
        app={appInfo}
        chip={t('interrupt.opened.chip')}
        tone="accent"
        title={t('interrupt.opened.title', { app })}
        text={t('interrupt.opened.text', { app })}
        footer={
          <>
            <PrimaryButton
              onClick={() => {
                updateState({
                  simulatedAppToOpen: null,
                  activeSession: {
                    appId: appInfo.id,
                    startTime: Date.now(),
                    extensionCount: 0,
                    isPaused: false,
                    sessionLimitOverride: sessionLimitOverrideMinutes,
                  },
                });
                navigate('active_session');
              }}
            >
              {t('interrupt.opened.go')}
            </PrimaryButton>
            <TextButton onClick={cancel}>{t('interrupt.opened.cancel')}</TextButton>
          </>
        }
      />
    );
  }

  return null;
}
