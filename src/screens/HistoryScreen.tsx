import { AlertTriangle, CheckCircle2, Clock, Shield, TimerReset } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Header } from '../components/ui';
import type { AppState, HistoryEvent, Screen } from '../types';
import { SUPPORTED_APPS } from '../types';

type Period = 'today' | 'week' | 'month';
type EventFilter = 'all' | 'intervention' | 'emergency' | 'open';

const getStartTimestamp = (period: Period): number => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === 'week') start.setDate(start.getDate() - 6);
  if (period === 'month') start.setDate(start.getDate() - 29);
  return start.getTime();
};

const eventMatchesFilter = (event: HistoryEvent, filter: EventFilter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'intervention') return event.type === 'block' || event.type === 'warning';
  if (filter === 'emergency') return event.type === 'emergency';
  return event.type === 'open';
};

const formatMinutes = (minutes: number): string => {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
};

const describeEvent = (event: HistoryEvent): { title: string; icon: typeof Shield; tone: string } => {
  const app = SUPPORTED_APPS.find((candidate) => candidate.id === event.appId);
  const appName = app?.name ?? (event.appId === 'system' ? 'Android-System' : 'App');

  if (event.type === 'block') return { title: `${appName} blockiert`, icon: Shield, tone: 'text-red-400' };
  if (event.type === 'warning') return { title: `Warnung · ${appName}`, icon: AlertTriangle, tone: 'text-amber-400' };
  if (event.type === 'emergency')
    return { title: `Notfallfreigabe · ${appName}`, icon: TimerReset, tone: 'text-amber-300' };
  if (event.type === 'open')
    return { title: `${appName} bewusst geöffnet`, icon: CheckCircle2, tone: 'text-emerald-400' };
  return { title: event.desc || 'Schutzereignis', icon: Clock, tone: 'text-zinc-400' };
};

export function HistoryScreen({ state, navigate }: { state: AppState; navigate: (screen: Screen) => void }) {
  const [period, setPeriod] = useState<Period>('week');
  const [filter, setFilter] = useState<EventFilter>('all');

  const startTimestamp = getStartTimestamp(period);
  const periodEvents = useMemo(
    () =>
      state.history
        .filter((event) => event.timestamp >= startTimestamp)
        .filter((event) => !['profile_change', 'rule_change'].includes(event.type))
        .sort((a, b) => b.timestamp - a.timestamp),
    [state.history, startTimestamp],
  );
  const visibleEvents = periodEvents.filter((event) => eventMatchesFilter(event, filter));
  const interventions = periodEvents.filter((event) => event.type === 'block' || event.type === 'warning').length;
  const emergencies = periodEvents.filter((event) => event.type === 'emergency').length;

  const periodDateKeys = new Set<string>();
  const cursor = new Date(startTimestamp);
  const now = new Date();
  while (cursor.getTime() <= now.getTime()) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    periodDateKeys.add(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  let measuredUsageMinutes = 0;
  let estimatedSavedMinutes = 0;
  for (const dateKey of periodDateKeys) {
    const stats = state.dailyStats[dateKey];
    if (!stats) continue;
    measuredUsageMinutes += Object.values(stats.usageMinutes).reduce((sum, value) => sum + value, 0);
    estimatedSavedMinutes += stats.savedTimeMinutes;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
      <Header title="Statistiken & Verlauf" onBack={() => navigate('dashboard')} />

      <div className="space-y-6">
        <nav aria-label="Zeitraum" className="flex rounded-xl border border-zinc-800/50 bg-zinc-900/80 p-1">
          {(['today', 'week', 'month'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              aria-pressed={period === value}
              className={`min-h-[44px] flex-1 rounded-lg text-xs font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                period === value ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'
              }`}
            >
              {value === 'today' ? 'Heute' : value === 'week' ? '7 Tage' : '30 Tage'}
            </button>
          ))}
        </nav>

        <section aria-label="Kennzahlen" className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5">
            <Shield size={16} className="text-emerald-400" aria-hidden="true" />
            <div className="mt-3 text-3xl font-mono font-bold text-zinc-100">{interventions}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Interventionen</div>
          </div>
          <div className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5">
            <TimerReset size={16} className="text-amber-400" aria-hidden="true" />
            <div className="mt-3 text-3xl font-mono font-bold text-zinc-100">{emergencies}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Notfälle</div>
          </div>
          <div className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5">
            <Clock size={16} className="text-blue-400" aria-hidden="true" />
            <div className="mt-3 text-2xl font-mono font-bold text-zinc-100">{formatMinutes(measuredUsageMinutes)}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Gemessene Freigabezeit
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5">
            <Clock size={16} className="text-zinc-500" aria-hidden="true" />
            <div className="mt-3 text-2xl font-mono font-bold text-zinc-100">
              {formatMinutes(estimatedSavedMinutes)}
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Geschätzt gespart</div>
          </div>
        </section>

        <p className="px-2 text-xs leading-relaxed text-zinc-600">
          „Gemessene Freigabezeit“ stammt aus lokal erfasster Nutzung während bewusster Freigaben. „Geschätzt gespart“
          ist keine exakte Messung: ScrollShield rechnet derzeit fünf Minuten pro Block-/Warnintervention als
          Produktschätzung.
        </p>

        <section aria-labelledby="history-events-title">
          <div className="mb-3 flex items-center justify-between gap-3 px-2">
            <h2 id="history-events-title" className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Ereignisse
            </h2>
            <select
              aria-label="Ereignistyp filtern"
              value={filter}
              onChange={(event) => setFilter(event.target.value as EventFilter)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <option value="all">Alle</option>
              <option value="intervention">Interventionen</option>
              <option value="emergency">Notfälle</option>
              <option value="open">Bewusste Öffnungen</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/70">
            {visibleEvents.length === 0 ? (
              <div className="p-8 text-center">
                <Shield size={24} className="mx-auto text-zinc-700" aria-hidden="true" />
                <div className="mt-3 text-sm font-semibold text-zinc-300">Keine passenden Ereignisse</div>
                <p className="mt-1 text-xs text-zinc-600">
                  Der lokale Verlauf füllt sich, sobald der Schutzdienst eingreift oder du bewusst freigibst.
                </p>
              </div>
            ) : (
              <ul aria-label="Lokaler Schutzverlauf">
                {visibleEvents.slice(0, 100).map((event) => {
                  const presentation = describeEvent(event);
                  const Icon = presentation.icon;
                  return (
                    <li key={event.id} className="flex gap-3 border-b border-zinc-800/50 p-4 last:border-b-0">
                      <div
                        className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-zinc-950 ${presentation.tone}`}
                        aria-hidden="true"
                      >
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-zinc-200">{presentation.title}</div>
                        <p className="mt-1 break-words text-xs leading-relaxed text-zinc-500">{event.desc}</p>
                        <time
                          className="mt-2 block text-[10px] font-mono text-zinc-600"
                          dateTime={new Date(event.timestamp).toISOString()}
                        >
                          {new Date(event.timestamp).toLocaleString('de-DE')}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <p className="px-2 text-xs leading-relaxed text-zinc-600">
          Der Verlauf bleibt lokal auf diesem Gerät. Notfallbegründungen erscheinen hier nur, wenn du diese Option
          selbst aktiviert und einen Grund eingegeben hast.
        </p>
      </div>
    </motion.div>
  );
}
