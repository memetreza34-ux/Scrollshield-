import { useEffect, useState } from 'react';
import { AppState, Screen, SUPPORTED_APPS } from '../types';
import {
  AppTile,
  Choice,
  List,
  Page,
  PrimaryButton,
  Row,
  SecondaryButton,
  Section,
  Switch,
  TabHeader,
} from '../components/ui';
import { createFocusEndUpdate, createFocusStartUpdate, getRunningFocusSession } from '../lib/focus';
import { FREE_LIMITS, hasPro, paywallFor, ProFeature } from '../lib/entitlements';
import { formatClock } from '../lib/commitment';
import { eventsOnDay } from '../lib/metrics';

type ScreenProps = {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
};

const CUSTOM_DURATIONS = [10, 20, 45, 90, 120];

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

const formatSeconds = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = (seconds % 60).toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
};

/** The full-screen view of a running focus or rescue session. */
export function RunningSession({ state, updateState, navigate }: ScreenProps) {
  const session = getRunningFocusSession(state);
  const endTime = session ? session.startTime + session.duration * 60_000 : null;
  const remaining = useRemainingSeconds(endTime);
  const [confirmEnd, setConfirmEnd] = useState(false);
  if (!session || endTime === null) return null;

  const isRescue = session.kind === 'rescue';
  const apps = SUPPORTED_APPS.filter((app) => session.protectedApps.includes(app.id));
  const interrupted = eventsOnDay(state.history, new Date()).filter(
    (event) =>
      event.timestamp >= session.startTime &&
      (event.type === 'block' || event.type === 'warning') &&
      session.protectedApps.includes(event.appId ?? ''),
  ).length;

  return (
    <div className="flex flex-col items-center pt-6 text-center">
      <p className="text-sm font-medium text-zinc-400">{isRescue ? 'Rescue läuft' : 'Fokus läuft'}</p>
      <p className="mt-4 text-6xl font-semibold tabular-nums text-zinc-50">{formatSeconds(remaining)}</p>
      <p className="mt-2 text-sm text-zinc-500">bis {formatClock(endTime)}</p>
      <p className="mt-6 text-sm text-zinc-400">
        {interrupted} {interrupted === 1 ? 'Öffnungsversuch' : 'Öffnungsversuche'} unterbrochen
      </p>

      <div className="mt-8 w-full text-left">
        <Section title="Gesperrt">
          <List>
            {apps.map((app) => (
              <Row key={app.id} leading={<AppTile app={app} size="sm" />} label={app.name} />
            ))}
          </List>
        </Section>
      </div>

      <div className="w-full">
        {session.strict ? (
          <p className="text-sm text-zinc-500">
            {isRescue ? 'Rescue' : 'Strenger Fokus'} lässt sich nicht vorzeitig beenden.
          </p>
        ) : confirmEnd ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">Fokus wirklich beenden?</p>
            <SecondaryButton
              onClick={() => {
                updateState(createFocusEndUpdate(state, false));
                navigate('today');
              }}
            >
              Ja, beenden
            </SecondaryButton>
            <PrimaryButton onClick={() => setConfirmEnd(false)}>Weitermachen</PrimaryButton>
          </div>
        ) : (
          <SecondaryButton onClick={() => setConfirmEnd(true)}>Fokus beenden</SecondaryButton>
        )}
      </div>
    </div>
  );
}

/** Fokus (docs/V1_MASTER_PLAN.md, 4.4). */
export function Focus({ state, updateState, navigate }: ScreenProps) {
  const pro = hasPro(state);
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);
  const [duration, setDuration] = useState<number>(30);
  const [appIds, setAppIds] = useState<string[]>(protectedApps.map((app) => app.id));
  const [strict, setStrict] = useState(false);
  const running = getRunningFocusSession(state);

  const paywall = (feature: ProFeature) => {
    updateState(paywallFor(feature));
    navigate('paywall');
  };

  if (running) {
    return (
      <Page>
        <TabHeader title="Fokus" navigate={navigate} />
        <RunningSession state={state} updateState={updateState} navigate={navigate} />
      </Page>
    );
  }

  return (
    <Page>
      <TabHeader title="Fokus" navigate={navigate} />

      <Section title="Dauer">
        <Choice<number>
          label="Dauer"
          value={duration}
          onChange={(minutes) => {
            if (!pro && !(FREE_LIMITS.focusDurations as readonly number[]).includes(minutes)) {
              paywall('custom_focus');
              return;
            }
            setDuration(minutes);
          }}
          options={[
            ...FREE_LIMITS.focusDurations.map((minutes) => ({ value: minutes, label: `${minutes} Min.` })),
            ...CUSTOM_DURATIONS.map((minutes) => ({ value: minutes, label: `${minutes} Min.`, pro: !pro })),
          ]}
        />
      </Section>

      <Section title="Diese Apps sind während des Fokus gesperrt">
        {protectedApps.length > 0 ? (
          <List>
            {protectedApps.map((app) => (
              <Row
                key={app.id}
                leading={<AppTile app={app} size="sm" />}
                label={app.name}
                right={
                  <Switch
                    checked={appIds.includes(app.id)}
                    ariaLabel={`${app.name} während des Fokus sperren`}
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
          <p className="px-1 text-sm text-zinc-500">Schütze zuerst eine App im Tab „Schutz“.</p>
        )}
      </Section>

      <Section>
        <List>
          <Row
            label="Strenger Fokus"
            description="Kein vorzeitiges Ende, keine Notfallfreigabe."
            pro={!pro}
            right={
              <Switch
                checked={strict}
                ariaLabel="Strenger Fokus"
                onChange={(checked) => (pro ? setStrict(checked) : paywall('strict_focus'))}
              />
            }
          />
        </List>
      </Section>

      <PrimaryButton
        disabled={appIds.length === 0}
        onClick={() => updateState(createFocusStartUpdate(state, duration, Date.now(), { appIds, strict }))}
      >
        Fokus starten
      </PrimaryButton>

      <div className="mt-10">
        <Section title="Rescue">
          <List>
            <Row
              label="Ich muss mich jetzt konzentrieren"
              description="Sperrt sofort alle geschützten Apps, ohne vorzeitiges Ende."
              pro={!pro}
              onClick={() => (pro ? navigate('rescue') : paywall('rescue'))}
            />
          </List>
        </Section>
      </div>
    </Page>
  );
}
