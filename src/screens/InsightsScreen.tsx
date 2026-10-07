import { useState } from 'react';
import { AppState, HistoryEvent, Screen, SUPPORTED_APPS } from '../types';
import { AppTile, Choice, List, Page, Row, Section, TabHeader } from '../components/ui';
import { eventsOnDay, getDayMetrics, getReopenHours, getWeekMetrics } from '../lib/metrics';
import { hasPro, paywallFor } from '../lib/entitlements';
import { formatClock } from '../lib/commitment';

type ScreenProps = {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
};

const EVENT_LABELS: Partial<Record<HistoryEvent['type'], string>> = {
  open: 'Geöffnet',
  block: 'Gesperrt',
  warning: 'Unterbrochen',
  emergency: 'Notfallfreigabe',
  focus_start: 'Fokus gestartet',
  focus_end: 'Fokus beendet',
  session_end: 'Sitzung beendet',
};

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-4">
      <p className="text-2xl font-semibold tabular-nums text-zinc-50">{value}</p>
      <p className="mt-1 text-sm text-zinc-400">{label}</p>
    </div>
  );
}

function TodayView({ state }: { state: AppState }) {
  const metrics = getDayMetrics(state);
  const events = eventsOnDay(state.history, new Date()).filter((event) => EVENT_LABELS[event.type]);
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);

  return (
    <>
      <div className="mb-8 grid grid-cols-2 gap-3">
        <Stat value={metrics.interruptions} label="Unterbrochen" />
        <Stat value={metrics.abandoned} label="Nicht geöffnet" />
        <Stat value={metrics.opens} label="Geöffnet" />
        <Stat value={metrics.reopens} label="Wieder geöffnet" />
        <Stat value={`${metrics.focusMinutes} Min.`} label="Fokus" />
        <Stat value={metrics.emergencyUnlocks} label="Notfallfreigaben" />
      </div>

      {protectedApps.length > 0 && (
        <Section title="Pro App">
          <List>
            {protectedApps.map((app) => {
              const entry = metrics.perApp.find((candidate) => candidate.appId === app.id);
              const usage =
                entry?.usageMinutes !== null && entry?.usageMinutes !== undefined
                  ? `${entry.usageMinutes} Min.`
                  : 'nicht gemessen';
              const feed =
                app.shortVideoSurface && entry?.shortVideoMinutes !== null && entry?.shortVideoMinutes !== undefined
                  ? ` · ${app.shortVideoSurface.name} ${entry.shortVideoMinutes} Min.`
                  : '';
              return (
                <Row
                  key={app.id}
                  leading={<AppTile app={app} size="sm" />}
                  label={app.name}
                  description={`Nutzung ${usage}${feed} · ${entry?.reopens ?? 0}× wieder geöffnet`}
                />
              );
            })}
          </List>
        </Section>
      )}

      <Section title="Verlauf heute">
        {events.length > 0 ? (
          <List>
            {events.slice(0, 50).map((event) => {
              const app = SUPPORTED_APPS.find((candidate) => candidate.id === event.appId);
              return (
                <Row
                  key={event.id}
                  label={`${formatClock(event.timestamp)} · ${EVENT_LABELS[event.type]}${app ? ` · ${app.name}` : ''}`}
                  description={event.desc}
                />
              );
            })}
          </List>
        ) : (
          <p className="px-1 text-sm text-zinc-500">Noch nichts passiert heute.</p>
        )}
      </Section>
    </>
  );
}

function WeekView({ state }: { state: AppState }) {
  const week = getWeekMetrics(state);
  const previous = getWeekMetrics(state, new Date(Date.now() - 7 * 24 * 60 * 60_000));
  const sum = (days: typeof week, key: 'interruptions' | 'opens' | 'reopens') =>
    days.reduce((total, day) => total + day.metrics[key], 0);
  const max = Math.max(1, ...week.map((day) => day.metrics.interruptions));
  const hours = getReopenHours(state.history);
  const maxHour = Math.max(1, ...hours);
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);

  const compare = (key: 'interruptions' | 'opens' | 'reopens', label: string) => {
    const now = sum(week, key);
    const before = sum(previous, key);
    const delta = now - before;
    return <Row label={label} value={`${now} (${delta >= 0 ? '+' : ''}${delta} zur Vorwoche)`} />;
  };

  return (
    <>
      <Section title="Unterbrechungen, letzte 7 Tage">
        <div
          className="flex h-32 items-end gap-2 rounded-2xl bg-zinc-900 p-4"
          role="img"
          aria-label="Unterbrechungen pro Tag"
        >
          {week.map(({ date, metrics }) => (
            <div key={date.toISOString()} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-sm bg-emerald-500/70"
                style={{ height: `${(metrics.interruptions / max) * 80}px` }}
              />
              <span className="text-[10px] text-zinc-500">
                {date.toLocaleDateString('de-DE', { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Woche im Vergleich">
        <List>
          {compare('interruptions', 'Unterbrochen')}
          {compare('opens', 'Geöffnet')}
          {compare('reopens', 'Wieder geöffnet')}
        </List>
      </Section>

      <Section title="Wann du wieder öffnest (14 Tage)">
        {hours.some((count) => count > 0) ? (
          <div
            className="flex h-24 items-end gap-[2px] rounded-2xl bg-zinc-900 p-4"
            role="img"
            aria-label="Wiederöffnungen nach Uhrzeit"
          >
            {hours.map((count, hour) => (
              <div
                key={hour}
                className="flex-1 rounded-sm bg-zinc-500"
                style={{ height: `${(count / maxHour) * 56 + 2}px` }}
                title={`${hour} Uhr: ${count}`}
              />
            ))}
          </div>
        ) : (
          <p className="px-1 text-sm text-zinc-500">Noch zu wenige Wiederöffnungen für ein Muster.</p>
        )}
      </Section>

      <Section title="App-Trends">
        <List>
          {protectedApps.map((app) => {
            const total = (days: typeof week) =>
              days.reduce(
                (sumOpens, day) => sumOpens + (day.metrics.perApp.find((entry) => entry.appId === app.id)?.opens ?? 0),
                0,
              );
            const now = total(week);
            const before = total(previous);
            return (
              <Row
                key={app.id}
                leading={<AppTile app={app} size="sm" />}
                label={app.name}
                value={`${now}× geöffnet (${now - before >= 0 ? '+' : ''}${now - before})`}
              />
            );
          })}
        </List>
      </Section>
    </>
  );
}

/** Einblicke (docs/V1_MASTER_PLAN.md, 4.5): only numbers with a real source. */
export function InsightsScreen({ state, updateState, navigate }: ScreenProps) {
  const [view, setView] = useState<'today' | 'week'>('today');
  const pro = hasPro(state);

  return (
    <Page>
      <TabHeader title="Einblicke" navigate={navigate} />
      <div className="mb-6">
        <Choice<'today' | 'week'>
          label="Zeitraum"
          value={view}
          onChange={(next) => {
            if (next === 'week' && !pro) {
              updateState(paywallFor('insights_week'));
              navigate('paywall');
              return;
            }
            setView(next);
          }}
          options={[
            { value: 'today', label: 'Heute' },
            { value: 'week', label: 'Woche', pro: !pro },
          ]}
        />
      </div>
      {view === 'today' ? <TodayView state={state} /> : <WeekView state={state} />}
    </Page>
  );
}
