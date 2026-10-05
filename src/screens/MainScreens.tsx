import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import {
  Shield,
  Smartphone,
  Settings,
  Play,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Target,
  CloudOff,
} from 'lucide-react';
import { AppState, Screen, SUPPORTED_APPS } from '../types';
import { Header } from '../components/ui';
import { createFocusEndUpdate } from '../lib/focus';
import { getLocalDateKey } from '../lib/appUtils';

const formatFocusMinutes = (minutes: number) =>
  minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} Min`;

export function Dashboard({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(6);
  const selectedApps = Object.values(state.appsConfig).filter((app) => app.active).length;
  const activeProfile = state.profiles?.find((profile) => profile.id === state.activeProfileId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysHistory = state.history.filter((event) => event.timestamp >= today.getTime());
  const focusSessions = todaysHistory.filter((event) => event.type === 'focus_start').length;
  const activeFocusSession = state.focusSessions.find((session) => session.endTime === null);
  const activeFocusMinutes = activeFocusSession
    ? Math.max(
        0,
        Math.min(
          activeFocusSession.duration,
          Math.floor((Date.now() - Math.max(activeFocusSession.startTime, today.getTime())) / 60_000),
        ),
      )
    : 0;
  const todayFocusMinutes = (state.dailyStats[getLocalDateKey(today)]?.focusMinutes ?? 0) + activeFocusMinutes;
  const weeklyFocusDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    return {
      label: day.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', ''),
      fullLabel: day.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }),
      minutes: (state.dailyStats[getLocalDateKey(day)]?.focusMinutes ?? 0) + (index === 6 ? activeFocusMinutes : 0),
    };
  });
  const weeklyFocusMinutes = weeklyFocusDays.map((day) => day.minutes);
  const weeklyFocusTotal = weeklyFocusMinutes.reduce((sum, minutes) => sum + minutes, 0);
  const weeklyFocusMax = Math.max(30, ...weeklyFocusMinutes);
  const chartScale = Math.max(15, Math.ceil(Math.max(...weeklyFocusMinutes) / 15) * 15);
  const selectedDay = weeklyFocusDays[selectedDayIndex];

  const tryInterruption = () => {
    const appId = Object.keys(state.appsConfig).find((id) => state.appsConfig[id]?.active) || 'instagram';
    updateState({ simulatedAppToOpen: appId });
    navigate('protection_flow');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4 p-5 pb-32 sm:p-6 sm:pb-32"
    >
      <header className="flex items-start justify-between gap-4 pb-1 pt-2">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#9ed6bd]">ScrollShield</p>
          <h1 className="max-w-xs font-display text-[30px] font-bold leading-[1.08] tracking-[-0.045em] text-[#f4f6ef]">
            Zeit für das, was zählt.
          </h1>
        </div>
        <button
          onClick={() => navigate('settings')}
          aria-label="Einstellungen"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#355048] bg-[#1a2825] text-[#c4d4cc] transition-colors hover:bg-[#263a34] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a9dcc0]"
        >
          <Settings size={20} aria-hidden="true" />
        </button>
      </header>

      <section
        aria-labelledby="focus-island-title"
        className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-[#304a40] bg-[#172823] px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.16)]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#b9e5c9]/12 text-[#b9e5c9]">
            <Clock size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="focus-island-title" className="text-xs font-semibold text-[#adc2b6]">
              Fokuszeit heute
            </h2>
            <p className="font-display text-[24px] font-bold leading-tight tabular-nums tracking-tight text-[#f4f6ef]">
              {formatFocusMinutes(todayFocusMinutes)}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right" aria-hidden="true">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9fb9aa]">7 Tage</span>
          <div className="mt-1 flex h-6 items-end justify-end gap-1.5">
            {weeklyFocusMinutes.map((minutes, index) => (
              <span
                key={index}
                className={`w-1.5 rounded-full ${minutes > 0 ? 'bg-[#a9dec0]' : 'bg-[#486057]'} ${index === 6 ? 'ring-2 ring-[#a9dec0]/25 ring-offset-2 ring-offset-[#172823]' : ''}`}
                style={{ height: `${Math.max(4, Math.round((minutes / weeklyFocusMax) * 21))}px` }}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="focus-card-title"
        className="relative overflow-hidden rounded-[2rem] border border-[#e7f2df] bg-[#dcebdd] p-6 text-[#14362b] shadow-[0_22px_46px_rgba(0,0,0,0.28)]"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#92b9a4]/50"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full border border-[#92b9a4]/45"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-4 top-14 h-24 w-24 rounded-full bg-[#eff9e8]/60 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#366d56]">
            <Target size={15} aria-hidden="true" /> Dein Fokusfenster
          </div>
          {state.isFocusModeActive ? (
            <>
              <h2 id="focus-card-title" className="font-display text-[26px] font-bold tracking-tight">
                Fokus läuft.
              </h2>
              <div aria-label={`Noch ${state.focusTimeRemaining} Minuten`} className="my-3 flex items-baseline gap-2">
                <span className="font-display text-[64px] font-bold tabular-nums leading-none tracking-[-0.075em]">
                  {state.focusTimeRemaining}
                </span>
                <span className="text-base font-medium text-[#436754]">Minuten übrig</span>
              </div>
              <button
                onClick={() => updateState(createFocusEndUpdate(state, false))}
                className="w-full rounded-2xl border border-[#638675] bg-[#c7dfce] px-5 py-3.5 font-semibold text-[#14362b] transition-colors hover:bg-[#b6d5c0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14362b]"
              >
                Fokus beenden
              </button>
            </>
          ) : (
            <>
              <h2
                id="focus-card-title"
                className="font-display text-[26px] font-bold leading-tight tracking-[-0.035em]"
              >
                Ein Moment nur für dich.
              </h2>
              <div className="my-3 flex items-baseline gap-2">
                <span className="font-display text-[64px] font-bold tabular-nums leading-none tracking-[-0.075em]">
                  {state.settings.defaultFocusDuration}
                </span>
                <span className="text-base font-medium text-[#436754]">Minuten als Startwert</span>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-[#345847]">Wähle deine Dauer und starte den Timer.</p>
              <button
                onClick={() => navigate('focus')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#173f32] px-5 py-3.5 font-bold text-[#f3f8ef] shadow-[0_8px_20px_rgba(24,67,50,0.18)] transition-colors hover:bg-[#265a45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173f32] focus-visible:ring-offset-2 focus-visible:ring-offset-[#dcebdd]"
              >
                <Play size={17} fill="currentColor" aria-hidden="true" /> Fokuszeit wählen
              </button>
            </>
          )}
        </div>
      </section>

      <section
        id="focus-chart"
        aria-labelledby="focus-chart-title"
        className="rounded-[1.75rem] border border-[#2e4439] bg-[#17241f] p-5 shadow-lg shadow-black/10"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="focus-chart-title" className="text-lg font-bold text-zinc-100">
              Deine Fokuszeit
            </h2>
            <p className="mt-0.5 text-sm text-[#aec1b3]">Minuten pro Tag · letzte 7 Tage</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold tabular-nums leading-none text-[#b9e5c9]">
              {formatFocusMinutes(weeklyFocusTotal)}
            </p>
            <p className="mt-1 text-xs text-[#aec1b3]">insgesamt</p>
          </div>
        </div>

        <div className="relative mt-5 pl-8">
          <div
            className="pointer-events-none absolute inset-y-0 left-8 right-0 flex flex-col justify-between"
            aria-hidden="true"
          >
            <span className="border-t border-dashed border-[#496052]/70" />
            <span className="border-t border-dashed border-[#496052]/50" />
            <span className="border-t border-[#496052]" />
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 flex flex-col justify-between text-[11px] tabular-nums text-[#a9bdb0]"
            aria-hidden="true"
          >
            <span>{chartScale}</span>
            <span>{Math.round(chartScale / 2)}</span>
            <span>0</span>
          </div>
          <div className="relative grid h-36 grid-cols-7 gap-1" role="group" aria-label="Fokusminuten pro Tag">
            {weeklyFocusDays.map((day, index) => (
              <button
                key={day.fullLabel}
                onClick={() => setSelectedDayIndex(index)}
                aria-label={`${day.fullLabel}: ${day.minutes} Minuten Fokus`}
                aria-pressed={selectedDayIndex === index}
                className="flex min-w-0 items-end justify-center rounded-xl px-1 pb-0.5 transition-colors hover:bg-[#2a4034] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9e5c9]"
              >
                <span
                  className={`w-full max-w-5 rounded-t-md transition-all ${day.minutes > 0 ? (selectedDayIndex === index ? 'bg-[#b9e5c9]' : 'bg-[#76af8d]') : 'bg-[#516056]'}`}
                  style={{
                    height: `${day.minutes > 0 ? Math.max(6, Math.round((day.minutes / chartScale) * 116)) : 4}px`,
                  }}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1" aria-hidden="true">
            {weeklyFocusDays.map((day, index) => (
              <span
                key={day.fullLabel}
                className={`text-center text-xs ${selectedDayIndex === index ? 'font-bold text-[#b9e5c9]' : 'text-[#a9bdb0]'}`}
              >
                {day.label}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-4 border-t border-[#2e4439] pt-3 text-sm text-[#d1ded2]" aria-live="polite">
          {weeklyFocusTotal === 0
            ? 'Noch keine Fokuszeit erfasst. Dein Verlauf erscheint nach der ersten Sitzung.'
            : `${selectedDay.fullLabel}: ${formatFocusMinutes(selectedDay.minutes)} Fokus`}
        </p>
      </section>

      <section aria-labelledby="setup-title">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 id="setup-title" className="text-lg font-bold text-zinc-100">
            Dein Setup
          </h2>
          <span className="text-sm text-zinc-400">Jederzeit anpassbar</span>
        </div>
        <div className="overflow-hidden rounded-[1.5rem] border border-[#2e4439] bg-[#17241f]">
          <button
            onClick={() => navigate('apps')}
            className="flex w-full items-center gap-4 border-b border-[#2e4439] px-5 py-4 text-left hover:bg-[#263c30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#b9e5c9]"
          >
            <Smartphone size={21} className="shrink-0 text-emerald-400" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-zinc-100">Apps für deine Ziele</span>
              <span className="block text-sm text-zinc-400">{selectedApps} ausgewählt</span>
            </span>
            <span className="text-zinc-400" aria-hidden="true">
              ›
            </span>
          </button>
          <button
            onClick={() => navigate('rules')}
            className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[#263c30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#b9e5c9]"
          >
            <Shield size={21} className="shrink-0 text-blue-400" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-zinc-100">Startprofil</span>
              <span className="block text-sm text-zinc-400">{activeProfile?.name || 'Standard'}</span>
            </span>
            <span className="text-zinc-400" aria-hidden="true">
              ›
            </span>
          </button>
        </div>
      </section>

      {!Capacitor.isNativePlatform() && (
        <p className="flex items-start gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm leading-relaxed text-zinc-300">
          <CloudOff size={17} className="mt-0.5 shrink-0 text-zinc-400" aria-hidden="true" />
          Im Browser kannst du Pausen üben und Fokuszeit planen. Andere Apps werden hier nicht automatisch gesperrt.
        </p>
      )}

      <section aria-labelledby="today-title" className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 id="today-title" className="mb-1 text-lg font-bold text-zinc-100">
          Heute
        </h2>
        <p className="text-[15px] leading-relaxed text-zinc-300">
          {focusSessions === 0
            ? 'Deine erste Fokuszeit wartet auf dich.'
            : `${focusSessions} ${focusSessions === 1 ? 'Fokuszeit' : 'Fokuszeiten'} gestartet.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold">
          <button onClick={tryInterruption} className="text-emerald-300 hover:text-emerald-200">
            Unterbrechung ausprobieren
          </button>
          <button onClick={() => navigate('history')} className="text-zinc-300 hover:text-white">
            Verlauf ansehen
          </button>
        </div>
      </section>
    </motion.div>
  );
}

export function History({ state, navigate: _navigate }: { state: AppState; navigate: (s: Screen) => void }) {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('week');
  const [typeFilter, setTypeFilter] = useState<'all' | 'block' | 'focus' | 'emergency'>('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter logic
  const filteredEvents = state.history.filter((ev) => {
    // Time filter
    const evDate = new Date(ev.timestamp);
    if (timeFilter === 'today' && evDate.getTime() < today.getTime()) return false;
    if (timeFilter === 'week' && evDate.getTime() < today.getTime() - 6 * 24 * 60 * 60 * 1000) return false;
    if (timeFilter === 'month' && evDate.getTime() < today.getTime() - 30 * 24 * 60 * 60 * 1000) return false;

    // Type filter
    if (typeFilter === 'block' && ev.type !== 'block' && ev.type !== 'warning') return false;
    if (typeFilter === 'focus' && ev.type !== 'focus_start' && ev.type !== 'focus_end' && ev.type !== 'focus')
      return false;
    if (typeFilter === 'emergency' && ev.type !== 'emergency') return false;

    // Hide system events in stats view by default
    if (ev.type === 'profile_change' || ev.type === 'rule_change') return false;

    return true;
  });

  // Calculate Chart Data
  let chartData: { name: string; blocks: number }[] = [];
  let chartTitle = 'Verlauf';

  if (timeFilter === 'week') {
    chartTitle = 'Verlauf der letzten 7 Tage';
    chartData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));

      const dayBlocks = state.history.filter((e) => {
        if (e.type !== 'block' && e.type !== 'warning') return false;
        const ed = new Date(e.timestamp);
        return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      }).length;

      return {
        name: d.toLocaleDateString('de-DE', { weekday: 'short' }),
        blocks: dayBlocks,
      };
    });
  } else if (timeFilter === 'month') {
    chartTitle = 'Verlauf der letzten 30 Tage';
    chartData = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));

      const dayBlocks = state.history.filter((e) => {
        if (e.type !== 'block' && e.type !== 'warning') return false;
        const ed = new Date(e.timestamp);
        return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      }).length;

      return {
        name: d.getDate() % 5 === 0 ? String(d.getDate()) : '',
        blocks: dayBlocks,
      };
    });
  } else if (timeFilter === 'today') {
    chartTitle = 'Verlauf Heute';
    chartData = Array.from({ length: 6 }).map((_, i) => {
      const startHour = i * 4;
      const endHour = startHour + 4;

      const rangeBlocks = state.history.filter((e) => {
        if (e.type !== 'block' && e.type !== 'warning') return false;
        const ed = new Date(e.timestamp);
        return (
          ed.getDate() === today.getDate() &&
          ed.getMonth() === today.getMonth() &&
          ed.getFullYear() === today.getFullYear() &&
          ed.getHours() >= startHour &&
          ed.getHours() < endHour
        );
      }).length;

      return {
        name: `${startHour}h`,
        blocks: rangeBlocks,
      };
    });
  }

  const rangeStart = new Date(today);
  rangeStart.setDate(today.getDate() - (timeFilter === 'today' ? 0 : timeFilter === 'week' ? 6 : 29));
  const rangeStartKey = getLocalDateKey(rangeStart);
  const todayKey = getLocalDateKey(today);
  const activeFocusSession = state.focusSessions.find((session) => session.endTime === null);
  const activeFocusMinutes = activeFocusSession
    ? Math.max(
        0,
        Math.min(
          activeFocusSession.duration,
          Math.floor((Date.now() - Math.max(activeFocusSession.startTime, rangeStart.getTime())) / 60_000),
        ),
      )
    : 0;
  const focusMinutesTotal =
    Object.entries(state.dailyStats)
      .filter(([dateKey]) => dateKey >= rangeStartKey && dateKey <= todayKey)
      .reduce((sum, [, day]) => sum + day.focusMinutes, 0) + activeFocusMinutes;

  // KPIs
  const blocksCount = filteredEvents.filter((e) => e.type === 'block' || e.type === 'warning').length;

  const appBlocks = filteredEvents
    .filter((e) => e.type === 'block' || e.type === 'warning')
    .reduce(
      (acc, curr) => {
        if (curr.appId) acc[curr.appId] = (acc[curr.appId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

  const topBlockedAppId = Object.keys(appBlocks).sort((a, b) => appBlocks[b] - appBlocks[a])[0];
  const topApp = SUPPORTED_APPS.find((a) => a.id === topBlockedAppId);
  const maxChartBlocks = Math.max(1, ...chartData.map((day) => day.blocks));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
      <Header title="Statistiken" />

      {/* Filters */}
      <section aria-label="Verlaufsfilter" className="space-y-3 mb-6">
        <nav aria-label="Zeitraum filtern" className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/50">
          {(['today', 'week', 'month'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              aria-pressed={timeFilter === t}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] ${timeFilter === t ? 'bg-zinc-800 text-zinc-100 shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {t === 'today' ? 'Heute' : t === 'week' ? '7 Tage' : 'Monat'}
            </button>
          ))}
        </nav>
      </section>

      {/* Must-Have KPIs */}
      <section aria-label="Kennzahlen" className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5">
          <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Shield size={12} /> Schutzereignisse
          </h3>
          <div className="text-3xl font-bold font-mono tracking-tighter mt-2 text-zinc-100">{blocksCount}</div>
        </div>
        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5">
          <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Clock size={12} /> Fokuszeit
          </h3>
          <div className="mt-2 whitespace-nowrap font-mono text-2xl font-bold tracking-tighter text-emerald-400">
            {formatFocusMinutes(focusMinutesTotal)}
          </div>
        </div>

        {topApp ? (
          <div className="col-span-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5 flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${topApp.color}`}
            >
              {topApp.icon}
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-0.5">
                Meiste Schutzereignisse
              </h3>
              <p className="font-semibold text-zinc-200">
                {topApp.name} ({appBlocks[topBlockedAppId]} Ereignisse)
              </p>
            </div>
          </div>
        ) : (
          <div className="col-span-2 bg-emerald-900/20 backdrop-blur-md border border-emerald-500/20 rounded-[1.5rem] p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner bg-emerald-500/20 text-emerald-400">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-0.5">
                Alles im grünen Bereich
              </h3>
              <p className="font-semibold text-emerald-100">
                In diesem Zeitraum wurden keine Schutzereignisse erfasst.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Chart */}
      <section
        aria-labelledby="chart-title"
        className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5 mb-8"
      >
        <h2 id="chart-title" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
          {chartTitle}
        </h2>
        <div
          className="h-48 w-full flex items-end gap-1.5 border-b border-zinc-800/70 pb-6"
          role="img"
          aria-label={`${chartTitle}: ${chartData.map((day) => `${day.name || 'Tag'} ${day.blocks}`).join(', ')}`}
        >
          {chartData.map((entry, index) => {
            const height = entry.blocks === 0 ? 8 : Math.max(12, Math.round((entry.blocks / maxChartBlocks) * 132));
            return (
              <div
                key={`${entry.name}-${index}`}
                className="flex-1 h-full flex flex-col justify-end items-center gap-2 min-w-0"
              >
                <div className="relative w-full max-w-8 flex justify-center group">
                  <div
                    className={`w-full rounded-md transition-colors ${entry.blocks > 0 ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                    style={{ height }}
                  />
                  <div className="pointer-events-none absolute bottom-full mb-2 hidden group-hover:block w-max max-w-40 rounded-lg bg-zinc-950 border border-zinc-800 px-2 py-1 text-center text-[10px] font-bold text-zinc-200 shadow-xl">
                    {entry.blocks} Ereignisse
                  </div>
                </div>
                <span className="max-w-full break-words text-center text-[10px] font-semibold text-zinc-500">
                  {entry.name}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Type Filter for Event List */}
      <nav aria-label="Ereignistyp filtern" className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        <button
          onClick={() => setTypeFilter('all')}
          aria-pressed={typeFilter === 'all'}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] ${typeFilter === 'all' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800/50'}`}
        >
          Alle
        </button>
        <button
          onClick={() => setTypeFilter('block')}
          aria-pressed={typeFilter === 'block'}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] ${typeFilter === 'block' ? 'bg-emerald-500 text-emerald-950' : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800/50'}`}
        >
          Schutz
        </button>
        <button
          onClick={() => setTypeFilter('emergency')}
          aria-pressed={typeFilter === 'emergency'}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] ${typeFilter === 'emergency' ? 'bg-amber-500 text-amber-950' : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800/50'}`}
        >
          Notfälle
        </button>
        <button
          onClick={() => setTypeFilter('focus')}
          aria-pressed={typeFilter === 'focus'}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] ${typeFilter === 'focus' ? 'bg-blue-500 text-blue-950' : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800/50'}`}
        >
          Fokus
        </button>
      </nav>

      <section aria-label="Verlaufsliste" className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 mt-12" aria-live="polite">
            <div
              className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-4"
              aria-hidden="true"
            >
              <Clock size={28} className="text-zinc-500" />
            </div>
            <h2 className="text-lg font-bold text-zinc-200 mb-2">Verlauf ist leer</h2>
            <p className="text-sm text-zinc-500 mb-6 max-w-[250px]">
              Hier siehst du später alle Ereignisse für diesen Zeitraum.
            </p>
          </div>
        ) : (
          <ul className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden">
            {filteredEvents.map((ev, i) => {
              const appInfo = SUPPORTED_APPS.find((a) => a.id === ev.appId);
              const date = new Date(ev.timestamp);
              const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
              const dateString = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

              let icon = <Play size={16} className="text-zinc-400" aria-hidden="true" />;
              let title = appInfo?.name || 'System';
              const desc = ev.desc;

              if (ev.type === 'block') {
                icon = <XCircle size={16} className="text-emerald-400" aria-hidden="true" />;
                title = `${appInfo?.name} blockiert`;
              } else if (ev.type === 'focus_start' || ev.type === 'focus') {
                icon = <Play size={16} className="text-blue-400" aria-hidden="true" />;
                title = 'Fokusmodus gestartet';
              } else if (ev.type === 'focus_end') {
                icon = <CheckCircle2 size={16} className="text-blue-400" aria-hidden="true" />;
                title = 'Fokusmodus beendet';
              } else if (ev.type === 'emergency') {
                icon = <AlertTriangle size={16} className="text-amber-500" aria-hidden="true" />;
                title = `Notfallfreigabe für ${appInfo?.name}`;
              } else if (ev.type === 'warning') {
                icon = <AlertTriangle size={16} className="text-orange-400" aria-hidden="true" />;
                title = `Warnung bei ${appInfo?.name}`;
              }

              return (
                <li
                  key={ev.id}
                  className={`p-5 flex items-start gap-4 ${i !== filteredEvents.length - 1 ? 'border-b border-zinc-800/50' : ''}`}
                >
                  <div
                    className="mt-1 w-8 h-8 rounded-full bg-zinc-800/80 flex items-center justify-center shadow-inner flex-shrink-0"
                    aria-hidden="true"
                  >
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm break-words pr-2 text-zinc-200">{title}</span>
                      <span
                        className="text-xs text-zinc-500 font-mono flex-shrink-0"
                        aria-label={`Am ${dateString} um ${timeString} Uhr`}
                      >
                        {timeFilter !== 'today' ? `${dateString} ` : ''}
                        {timeString}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm break-words">{desc}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </motion.div>
  );
}
