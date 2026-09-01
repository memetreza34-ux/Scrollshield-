import { useMemo, useState } from 'react';
import { Activity, Clock, ShieldCheck, TimerReset, TrendingDown, TrendingUp } from 'lucide-react';
import { compareProtectionInsightPeriods } from '../lib/protectionInsights';
import { SUPPORTED_APPS } from '../types';
import type { AppState } from '../types';

const formatMinutes = (minutes: number) => {
  const rounded = Math.round(Math.max(0, minutes));
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
};

const signedMinutes = (minutes: number) => {
  if (Math.abs(minutes) < 0.5) return '±0m';
  return `${minutes > 0 ? '+' : '−'}${formatMinutes(Math.abs(minutes))}`;
};

export function ProtectionInsightsPanel({ state, now = new Date() }: { state: AppState; now?: Date }) {
  const [days, setDays] = useState<7 | 30>(7);
  const comparison = useMemo(
    () => compareProtectionInsightPeriods(state.dailyStats, now, days),
    [state.dailyStats, now, days],
  );
  const topApp = SUPPORTED_APPS.find((app) => app.id === comparison.current.topMeasuredAppId);
  const usageImproved = comparison.measuredUsageChangeMinutes < -0.5;
  const usageIncreased = comparison.measuredUsageChangeMinutes > 0.5;

  return (
    <section aria-labelledby="protection-insights-title" className="space-y-4">
      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <h2 id="protection-insights-title" className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Lokale Insights
          </h2>
          <p className="mt-1 text-xs text-zinc-500">Nur Werte aus deinem lokalen Schutzverlauf.</p>
        </div>
        <div className="flex rounded-xl border border-zinc-800 bg-zinc-900 p-1" aria-label="Insight-Zeitraum">
          {([7, 30] as const).map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={days === period}
              onClick={() => setDays(period)}
              className={`min-h-[40px] rounded-lg px-3 text-xs font-bold ${days === period ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500'}`}
            >
              {period} Tage
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <article className="rounded-[1.4rem] border border-zinc-800/60 bg-zinc-900/70 p-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <Clock size={15} aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Gemessene Nutzung</span>
          </div>
          <p className="mt-3 text-2xl font-bold font-mono text-zinc-100">
            {formatMinutes(comparison.current.measuredUsageMinutes)}
          </p>
          <p
            className={`mt-2 flex items-center gap-1 text-xs ${usageImproved ? 'text-emerald-400' : usageIncreased ? 'text-amber-400' : 'text-zinc-500'}`}
          >
            {usageImproved ? (
              <TrendingDown size={14} aria-hidden="true" />
            ) : usageIncreased ? (
              <TrendingUp size={14} aria-hidden="true" />
            ) : null}
            {signedMinutes(comparison.measuredUsageChangeMinutes)} zum vorherigen Zeitraum
          </p>
          {comparison.measuredUsageChangePercent !== null && (
            <p className="mt-1 text-[11px] text-zinc-600">
              {comparison.measuredUsageChangePercent > 0 ? '+' : ''}
              {Math.round(comparison.measuredUsageChangePercent)} % gemessene Nutzung
            </p>
          )}
        </article>

        <article className="rounded-[1.4rem] border border-zinc-800/60 bg-zinc-900/70 p-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <Activity size={15} aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Interventionen</span>
          </div>
          <p className="mt-3 text-2xl font-bold font-mono text-zinc-100">{comparison.current.interventions}</p>
          <p className="mt-2 text-xs text-zinc-500">
            {comparison.interventionsChange > 0 ? '+' : ''}
            {comparison.interventionsChange} zum vorherigen Zeitraum
          </p>
        </article>

        <article className="rounded-[1.4rem] border border-zinc-800/60 bg-zinc-900/70 p-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <ShieldCheck size={15} aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Notfallfreigaben</span>
          </div>
          <p className="mt-3 text-2xl font-bold font-mono text-zinc-100">{comparison.current.emergencyUnlocks}</p>
          <p className="mt-2 text-xs text-zinc-500">
            {comparison.emergencyUnlocksChange > 0 ? '+' : ''}
            {comparison.emergencyUnlocksChange} zum vorherigen Zeitraum
          </p>
        </article>

        <article className="rounded-[1.4rem] border border-zinc-800/60 bg-zinc-900/70 p-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <TimerReset size={15} aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Fokuszeit</span>
          </div>
          <p className="mt-3 text-2xl font-bold font-mono text-zinc-100">
            {formatMinutes(comparison.current.focusMinutes)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {signedMinutes(comparison.focusMinutesChange)} zum vorherigen Zeitraum
          </p>
        </article>
      </div>

      <article className="rounded-[1.5rem] border border-zinc-800/60 bg-zinc-900/70 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ø gemessene Nutzung / Tag</p>
            <p className="mt-2 text-xl font-bold font-mono text-zinc-200">
              {formatMinutes(comparison.current.averageMeasuredUsageMinutes)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Meiste gemessene Nutzung</p>
            <p className="mt-2 text-sm font-semibold text-zinc-200">
              {topApp
                ? `${topApp.name} · ${formatMinutes(comparison.current.topMeasuredAppMinutes)}`
                : 'Noch keine gemessene Nutzung'}
            </p>
          </div>
        </div>
        <p className="mt-4 border-t border-zinc-800/70 pt-4 text-xs leading-relaxed text-zinc-500">
          „Gemessene Nutzung“ basiert auf den lokal importierten Android-Freigabezeiten. „Geschätzt gespart“ bleibt eine
          separate Produktschätzung und wird hier nicht als Messwert ausgegeben.
        </p>
      </article>
    </section>
  );
}
