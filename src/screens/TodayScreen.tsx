import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AppState, Screen, SUPPORTED_APPS } from '../types';
import { ScrollShieldBridge, type PermissionStatus } from '../lib/nativeBridge';
import { getProtectionHealth } from '../lib/protectionHealth';
import {
  AppTile,
  List,
  Page,
  PrimaryButton,
  ProBadge,
  Row,
  SecondaryButton,
  Section,
  TabHeader,
} from '../components/ui';
import { describeAppDay, getDayMetrics } from '../lib/metrics';
import { canAddSchedule, hasPro, paywallFor } from '../lib/entitlements';
import { getRunningFocusSession } from '../lib/focus';
import { createSchedule, formatScheduleRange, getActiveScheduleForApp, getNextSchedule } from '../lib/schedules';
import { formatUntil, isCommitmentActive } from '../lib/commitment';
import { getLocalDateKey } from '../lib/appUtils';
import { getSuggestion, Suggestion } from '../lib/suggestions';
import { applyPreset } from '../lib/presets';
import { normalizeAppConfig } from '../lib/state';

type ScreenProps = {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
};

/** "3 Std. 12 Min." or "48 Min." */
const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} Min.`;
  return rest === 0 ? `${hours} Std.` : `${hours} Std. ${rest} Min.`;
};

/** Heute (docs/V1_MASTER_PLAN.md, 4.2): is protection on, and what happened today. */
export function TodayScreen({ state, updateState, navigate }: ScreenProps) {
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);
  const metrics = getDayMetrics(state);
  const running = getRunningFocusSession(state);
  const nextSchedule = getNextSchedule(state.schedules);
  const activeSchedule = state.schedules.find((schedule) =>
    protectedApps.some((app) => getActiveScheduleForApp([schedule], app.id)),
  );
  const isWeb = state.operatingSystem === 'web';
  const isNativeAndroid = state.operatingSystem === 'android' && Capacitor.isNativePlatform();
  const hasProtectedApps = protectedApps.length > 0;
  const [nativeStatus, setNativeStatus] = useState<PermissionStatus | 'unavailable' | null>(null);

  // The stored permission flags can be stale after process death or a system
  // settings change. Recheck the actual Android permissions AND running service
  // whenever the dashboard opens or the user returns from another app.
  useEffect(() => {
    if (!isNativeAndroid || !hasProtectedApps) return;
    let mounted = true;
    let latestRequest = 0;

    const refresh = async () => {
      const request = ++latestRequest;
      setNativeStatus(null); // Never show a stale green state while refreshing.
      try {
        const result = await ScrollShieldBridge.getPermissionStatus();
        if (mounted && request === latestRequest) setNativeStatus(result);
      } catch {
        if (mounted && request === latestRequest) setNativeStatus('unavailable');
      }
    };

    const onReturn = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    void refresh();
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
    };
  }, [isNativeAndroid, hasProtectedApps]);

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const screenToday = state.dailyStats[getLocalDateKey(now)]?.screenTimeMinutes;
  const screenYesterday = state.dailyStats[getLocalDateKey(yesterday)]?.screenTimeMinutes;
  const protectedMinutes = metrics.perApp.reduce((sum, app) => sum + (app.usageMinutes ?? 0), 0);
  const suggestion = getSuggestion(state, now);

  const status = getProtectionHealth(protectedApps.length, isNativeAndroid, nativeStatus);

  const openRescue = () => {
    if (hasPro(state)) navigate('rescue');
    else {
      updateState(paywallFor('rescue'));
      navigate('paywall');
    }
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

  return (
    <Page>
      <TabHeader title="Heute" navigate={navigate} />

      {isWeb && (
        <p className="mb-6 rounded-xl border border-zinc-800 px-4 py-3 text-sm text-zinc-400">
          Vorschau im Browser. Bildschirmzeit und echte Sperren gibt es nur in der Android-App.
        </p>
      )}

      {/* Status */}
      <button
        onClick={() => navigate(status.destination)}
        className="mb-8 block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <span className={`block font-semibold ${status.tone}`}>{status.label}</span>
        <span className="mt-0.5 block text-sm text-zinc-400">
          {protectedApps.length === 0
            ? 'Wähle mindestens eine App aus.'
            : `${protectedApps.length} ${protectedApps.length === 1 ? 'App' : 'Apps'} ${status.operating ? 'geschützt' : 'zum Schutz ausgewählt'}`}
          {isCommitmentActive(state) && state.commitment
            ? ` · Selbstverpflichtung bis ${formatUntil(state.commitment.until)}`
            : ''}
        </span>
      </button>

      {/* Bildschirmzeit */}
      <Section title="Bildschirmzeit heute">
        <div className="rounded-2xl bg-zinc-900 p-5">
          {screenToday !== undefined ? (
            <>
              <p className="text-3xl font-semibold tabular-nums text-zinc-50">{formatMinutes(screenToday)}</p>
              {screenYesterday !== undefined && (
                <p className="mt-1 text-sm text-zinc-500">gestern {formatMinutes(screenYesterday)}</p>
              )}
              {protectedApps.length > 0 && (
                <p className="mt-2 text-sm text-zinc-400">Davon geschützte Apps: {formatMinutes(protectedMinutes)}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              {isWeb
                ? 'Nicht gemessen – der Browser sieht keine Bildschirmzeit.'
                : 'Nicht gemessen – dafür braucht ScrollShield den App-Nutzungszugriff.'}
            </p>
          )}
        </div>
      </Section>

      {/* Hauptzahl */}
      {protectedApps.length > 0 && (
        <Section>
          <p className="px-1 text-3xl font-semibold tabular-nums text-zinc-50">
            {metrics.interruptions}{' '}
            <span className="text-base font-medium text-zinc-300">
              {metrics.interruptions === 1 ? 'Öffnung' : 'Öffnungen'} unterbrochen
            </span>
          </p>
          {metrics.abandoned > 0 && (
            <p className="mt-1 px-1 text-sm text-zinc-400">davon {metrics.abandoned}× nicht geöffnet</p>
          )}
        </Section>
      )}

      {/* Aktionen */}
      {running ? (
        <Section>
          <List>
            <Row
              label={running.kind === 'rescue' ? 'Rescue läuft' : 'Fokus läuft'}
              value={`noch ${state.focusTimeRemaining} Min.`}
              onClick={() => navigate(running.kind === 'rescue' ? 'rescue' : 'focus')}
            />
          </List>
        </Section>
      ) : protectedApps.length > 0 ? (
        <div className="mb-8 grid grid-cols-2 gap-3">
          <PrimaryButton onClick={() => navigate('focus')}>Fokus starten</PrimaryButton>
          <SecondaryButton onClick={openRescue}>Rescue {!hasPro(state) && <ProBadge />}</SecondaryButton>
        </div>
      ) : (
        <div className="mb-8">
          <PrimaryButton onClick={() => navigate('protect')}>App schützen</PrimaryButton>
        </div>
      )}

      {/* Apps */}
      {protectedApps.length > 0 && (
        <Section title="Deine Apps heute">
          <List>
            {protectedApps.map((app) => {
              const appMetrics = metrics.perApp.find((entry) => entry.appId === app.id);
              const observation = appMetrics ? describeAppDay(appMetrics) : null;
              const parts = [
                appMetrics?.usageMinutes !== null && appMetrics?.usageMinutes !== undefined
                  ? formatMinutes(appMetrics.usageMinutes)
                  : null,
                app.shortVideoSurface && appMetrics?.shortVideoMinutes
                  ? `${app.shortVideoSurface.name.split(' ').at(-1)} ${appMetrics.shortVideoMinutes} Min.`
                  : null,
                `${appMetrics?.opens ?? 0}× geöffnet`,
              ].filter(Boolean);
              return (
                <Row
                  key={app.id}
                  leading={<AppTile app={app} size="sm" />}
                  label={app.name}
                  description={[parts.join(' · '), observation].filter(Boolean).join('\n')}
                  onClick={() => {
                    updateState({ selectedAppId: app.id });
                    navigate('app_detail');
                  }}
                />
              );
            })}
          </List>
          {metrics.opens === 0 && metrics.interruptions === 0 && (
            <p className="mt-3 px-1 text-sm text-zinc-500">Noch nichts passiert heute.</p>
          )}
        </Section>
      )}

      {/* Vorschlag */}
      {suggestion && (
        <Section title="Vorschlag">
          <div className="rounded-2xl bg-zinc-900 p-5">
            <p className="text-zinc-100">{suggestion.text}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => applySuggestion(suggestion)}
                className="min-h-[44px] rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
              >
                {suggestion.actionLabel}
              </button>
              <button
                onClick={() => hideSuggestion(suggestion.id)}
                className="min-h-[44px] px-2 text-sm text-zinc-500 hover:text-zinc-300"
              >
                Ausblenden
              </button>
            </div>
          </div>
        </Section>
      )}

      {/* Zeitplan */}
      {(activeSchedule || nextSchedule) && (
        <Section title="Zeitplan">
          <List>
            {activeSchedule ? (
              <Row
                label={`${activeSchedule.name} läuft`}
                value={formatScheduleRange(activeSchedule)}
                onClick={() => navigate('protect')}
              />
            ) : (
              nextSchedule && (
                <Row
                  label={`Ab ${nextSchedule.startHour.toString().padStart(2, '0')}:00 ${nextSchedule.name}`}
                  value={formatScheduleRange(nextSchedule)}
                  onClick={() => navigate('protect')}
                />
              )
            )}
          </List>
        </Section>
      )}

      {isWeb && protectedApps.length > 0 && (
        <Section title="Vorschau: Öffnen ausprobieren">
          <List>
            {protectedApps.map((app) => (
              <Row
                key={app.id}
                leading={<AppTile app={app} size="sm" />}
                label={`${app.name} öffnen`}
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
