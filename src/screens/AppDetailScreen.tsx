import { AlertTriangle, Clock, Info, Moon, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { Header, Switch, TimeSelector } from '../components/ui';
import { normalizeProtectionConfig } from '../lib/protectionConfig';
import type { AppConfig, AppState, Screen } from '../types';
import { DEFAULT_APP_CONFIG, SUPPORTED_APPS } from '../types';

const BLOCK_RANGE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

const parseBlockRange = (value: string): [string, string] | null => {
  const match = BLOCK_RANGE_PATTERN.exec(value.trim());
  if (!match) return null;
  return [`${match[1]}:${match[2]}`, `${match[3]}:${match[4]}`];
};

export function AppDetailScreen({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  navigate: (screen: Screen) => void;
}) {
  const appId = state.selectedAppId;
  const appInfo = SUPPORTED_APPS.find((app) => app.id === appId);

  if (!appId || !appInfo) return null;

  const config = normalizeProtectionConfig(
    state.appsConfig[appId] ?? { id: appId, ...DEFAULT_APP_CONFIG },
  );
  const parsedBlockRange = parseBlockRange(config.blockHours);
  const blockWindowEnabled = parsedBlockRange !== null;
  const blockStart = parsedBlockRange?.[0] ?? '22:00';
  const blockEnd = parsedBlockRange?.[1] ?? '07:00';

  const updateConfig = (updates: Partial<AppConfig>) => {
    const nextConfig = normalizeProtectionConfig({
      ...config,
      ...updates,
    });
    updateState({
      appsConfig: {
        ...state.appsConfig,
        [appId]: nextConfig,
      },
    });
  };

  const updateEmergency = (updates: Partial<AppConfig['emergencyUnlock']>) => {
    updateConfig({
      emergencyUnlock: {
        ...DEFAULT_APP_CONFIG.emergencyUnlock,
        ...config.emergencyUnlock,
        ...updates,
      },
    });
  };

  const updateAntiBinge = (updates: Partial<AppConfig['antiBinge']>) => {
    updateConfig({
      antiBinge: {
        ...DEFAULT_APP_CONFIG.antiBinge,
        ...config.antiBinge,
        ...updates,
      },
    });
  };

  const updateBlockWindow = (start: string, end: string) => {
    if (start === end) return;
    updateConfig({ blockHours: `${start}-${end}` });
  };

  const emergency = config.emergencyUnlock;
  const antiBinge = config.antiBinge;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32 flex flex-col h-full"
    >
      <Header title={appInfo.name} onBack={() => navigate('apps')} />

      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide">
        <section className="rounded-[2rem] border border-zinc-800/50 bg-zinc-900/80 p-6 shadow-lg" aria-label="Schutz aktivieren">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-lg">Schutz aktivieren</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Version 1 schützt die gesamte ausgewählte App. Einzelne Reels-, Shorts- oder Feed-Bereiche werden nicht separat erkannt.
              </p>
            </div>
            <Switch
              checked={config.active}
              onChange={(active) => updateConfig({ active })}
              ariaLabel={`${appInfo.name} Schutz aktivieren`}
            />
          </div>
        </section>

        <div
          className={`space-y-6 transition-opacity duration-300 ${!config.active ? 'opacity-40 pointer-events-none grayscale' : ''}`}
          aria-hidden={!config.active}
        >
          <section aria-labelledby="app-detail-mode-title">
            <h2 id="app-detail-mode-title" className="px-2 mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Schutzmodus
            </h2>
            <div
              className="flex rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-1.5 shadow-inner"
              role="radiogroup"
              aria-labelledby="app-detail-mode-title"
            >
              {(['soft', 'standard', 'strict'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={config.mode === mode}
                  onClick={() => updateConfig({ mode })}
                  className={`min-h-[44px] flex-1 rounded-xl py-3 text-sm font-semibold capitalize transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    config.mode === mode ? 'bg-zinc-100 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="app-detail-limits-title">
            <h2 id="app-detail-limits-title" className="px-2 mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Limits & bewusste Öffnung
            </h2>
            <div className="overflow-hidden rounded-[2rem] border border-zinc-800/50 bg-zinc-900/80">
              <div className="flex items-center justify-between gap-4 border-b border-zinc-800/50 p-6">
                <div className="flex items-start gap-3">
                  <Clock size={18} className="mt-0.5 flex-shrink-0 text-zinc-500" aria-hidden="true" />
                  <div>
                    <div className="font-semibold">Tageslimit</div>
                    <p className="mt-1 text-xs text-zinc-500">Nach Erreichen greift eine strikte Sperre bis zum nächsten lokalen Tag.</p>
                  </div>
                </div>
                <TimeSelector
                  value={config.dailyLimit}
                  onChange={(dailyLimit) => updateConfig({ dailyLimit })}
                  options={[15, 30, 60, 90, 120]}
                  allowDisabled
                  disabledLabel="Aus"
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-zinc-800/50 p-6">
                <div>
                  <div className="font-semibold">Session-Länge</div>
                  <p className="mt-1 text-xs text-zinc-500">So lange bleibt eine bewusst freigegebene Öffnung maximal aktiv. Mindestens eine Minute.</p>
                </div>
                <TimeSelector
                  value={config.sessionLimit}
                  onChange={(sessionLimit) => updateConfig({ sessionLimit })}
                  options={[1, 2, 5, 10, 15, 30]}
                />
              </div>

              <div className="flex items-center justify-between gap-4 p-6">
                <div>
                  <div className="font-semibold">Öffnungsverzögerung</div>
                  <p className="mt-1 text-xs text-zinc-500">Unterbricht den automatischen Griff zur App vor einer normalen Freigabe.</p>
                </div>
                <TimeSelector
                  value={config.openDelay}
                  onChange={(openDelay) => updateConfig({ openDelay })}
                  options={[5, 10, 15, 30]}
                  unit="Sek"
                  allowDisabled
                  disabledLabel="Aus"
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="app-detail-schedule-title">
            <h2 id="app-detail-schedule-title" className="px-2 mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Tägliches Sperrfenster
            </h2>
            <div className="overflow-hidden rounded-[2rem] border border-zinc-800/50 bg-zinc-900/80">
              <div className="flex items-center justify-between gap-4 border-b border-zinc-800/50 p-6">
                <div className="flex items-start gap-3 pr-4">
                  <Moon size={18} className="mt-0.5 flex-shrink-0 text-indigo-400" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold">Jeden Tag strikt sperren</h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      Funktioniert auch über Mitternacht, zum Beispiel 22:30 bis 07:00.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={blockWindowEnabled}
                  onChange={(enabled) => updateConfig({ blockHours: enabled ? '22:00-07:00' : '' })}
                  ariaLabel="Tägliches Sperrfenster aktivieren"
                />
              </div>

              {blockWindowEnabled && (
                <div className="grid grid-cols-2 gap-4 bg-zinc-900/50 p-6">
                  <label className="text-xs font-semibold text-zinc-400">
                    Von
                    <input
                      type="time"
                      aria-label="Sperrfenster Start"
                      value={blockStart}
                      onChange={(event) => updateBlockWindow(event.target.value, blockEnd)}
                      className="mt-2 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    />
                  </label>
                  <label className="text-xs font-semibold text-zinc-400">
                    Bis
                    <input
                      type="time"
                      aria-label="Sperrfenster Ende"
                      value={blockEnd}
                      onChange={(event) => updateBlockWindow(blockStart, event.target.value)}
                      className="mt-2 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    />
                  </label>
                  <p className="col-span-2 text-xs leading-relaxed text-zinc-500">
                    Start ist inklusive, Ende exklusive. Identische Start- und Endzeit wird nicht gespeichert, damit kein versehentlicher 24-Stunden-Block entsteht.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="app-detail-focus-title">
            <h2 id="app-detail-focus-title" className="px-2 mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Fokus
            </h2>
            <div className="rounded-[2rem] border border-zinc-800/50 bg-zinc-900/80 p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="pr-4">
                  <h3 className="font-semibold">Bei aktiver Fokus-Sitzung</h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">Bestimmt, ob diese App normal bleibt, warnt oder strikt blockiert wird.</p>
                </div>
                <select
                  aria-label="Fokus-Modus Verhalten"
                  value={config.focusModeBehavior}
                  onChange={(event) => updateConfig({ focusModeBehavior: event.target.value as AppConfig['focusModeBehavior'] })}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <option value="allow">Erlauben</option>
                  <option value="warn">Warnen</option>
                  <option value="block">Blockieren</option>
                </select>
              </div>
            </div>
          </section>

          <section aria-labelledby="app-detail-emergency-title">
            <h2 id="app-detail-emergency-title" className="px-2 mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Notfallfreigabe
            </h2>
            <div className="overflow-hidden rounded-[2rem] border border-zinc-800/50 bg-zinc-900/80">
              <div className="flex items-center justify-between gap-4 border-b border-zinc-800/50 p-6">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={17} className="text-amber-400" aria-hidden="true" />
                    <h3 className="font-semibold">Begrenzten Ausnahmezugang erlauben</h3>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    Ein sicherer Ausnahmeweg bleibt bewusst begrenzt. „Zurück zum Startbildschirm“ bleibt im Blockbildschirm immer verfügbar.
                  </p>
                </div>
                <Switch
                  checked={emergency.enabled}
                  onChange={(enabled) => updateEmergency({ enabled })}
                  ariaLabel="Notfall-Zugang erlauben"
                />
              </div>

              {emergency.enabled && (
                <>
                  <div className="flex items-center justify-between gap-4 border-b border-zinc-800/50 bg-zinc-900/50 p-6">
                    <label className="font-semibold text-sm">Freigabedauer</label>
                    <TimeSelector
                      value={emergency.durationMinutes}
                      onChange={(durationMinutes) => updateEmergency({ durationMinutes })}
                      options={[2, 5, 10]}
                      unit="Min"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-zinc-800/50 bg-zinc-900/50 p-6">
                    <label className="font-semibold text-sm">Maximal pro Tag</label>
                    <TimeSelector
                      value={emergency.maxPerDay}
                      onChange={(maxPerDay) => updateEmergency({ maxPerDay })}
                      options={[1, 2, 3, 5]}
                      unit="x"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-zinc-800/50 bg-zinc-900/50 p-6">
                    <div className="pr-4">
                      <h3 className="font-semibold text-sm">Zusätzlichen Countdown verlangen</h3>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">Im strikten Block wird die Notfallfreigabe dadurch nicht impulsiv sofort verfügbar.</p>
                    </div>
                    <Switch
                      checked={emergency.requireCountdown}
                      onChange={(requireCountdown) => updateEmergency({ requireCountdown })}
                      ariaLabel="Notfall-Countdown verlangen"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 bg-zinc-900/50 p-6">
                    <div className="pr-4">
                      <h3 className="font-semibold text-sm">Begründung verlangen</h3>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        Mindestens drei Zeichen. Der Text ist auf 160 Zeichen begrenzt und wird nur im lokalen Verlauf gespeichert.
                      </p>
                    </div>
                    <Switch
                      checked={emergency.requireReason}
                      onChange={(requireReason) => updateEmergency({ requireReason })}
                      ariaLabel="Notfall-Begründung verlangen"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          <section aria-labelledby="app-detail-antibinge-title">
            <h2 id="app-detail-antibinge-title" className="px-2 mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Anti-Binge
            </h2>
            <div className="overflow-hidden rounded-[2rem] border border-zinc-800/50 bg-zinc-900/80">
              <div className="flex items-center justify-between gap-4 border-b border-zinc-800/50 p-6">
                <div className="pr-4">
                  <h3 className="font-semibold">Wiederholtes Öffnen erkennen</h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">Zählt bewusste Öffnungen lokal und kann zuerst warnen und später strikt blockieren.</p>
                </div>
                <Switch
                  checked={antiBinge.enabled}
                  onChange={(enabled) => updateAntiBinge({ enabled })}
                  ariaLabel="Anti-Binge aktivieren"
                />
              </div>

              {antiBinge.enabled && (
                <>
                  <div className="border-b border-zinc-800/50 bg-zinc-900/50 p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <label htmlFor="warning-threshold" className="font-semibold">Warnung nach</label>
                      <span className="rounded-lg bg-zinc-800/60 px-3 py-1 text-sm font-mono text-zinc-300">
                        {antiBinge.warningThreshold}x / {antiBinge.warningTimeframe}m
                      </span>
                    </div>
                    <input
                      id="warning-threshold"
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={antiBinge.warningThreshold}
                      onChange={(event) => updateAntiBinge({ warningThreshold: Number(event.target.value) })}
                      className="w-full accent-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    />
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <label className="text-sm text-zinc-400">Warn-Zeitfenster</label>
                      <TimeSelector
                        value={antiBinge.warningTimeframe}
                        onChange={(warningTimeframe) => updateAntiBinge({ warningTimeframe })}
                        options={[5, 10, 15, 20, 30]}
                      />
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <label htmlFor="block-threshold" className="font-semibold text-red-400">Strikte Sperre nach</label>
                      <span className="rounded-lg bg-zinc-800/60 px-3 py-1 text-sm font-mono text-zinc-300">
                        {antiBinge.blockThreshold}x / {antiBinge.blockTimeframe}m
                      </span>
                    </div>
                    <input
                      id="block-threshold"
                      type="range"
                      min="2"
                      max="15"
                      step="1"
                      value={antiBinge.blockThreshold}
                      onChange={(event) => updateAntiBinge({ blockThreshold: Number(event.target.value) })}
                      className="w-full accent-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    />
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <label className="text-sm text-zinc-400">Sperr-Zeitfenster</label>
                      <TimeSelector
                        value={antiBinge.blockTimeframe}
                        onChange={(blockTimeframe) => updateAntiBinge({ blockTimeframe })}
                        options={[5, 10, 15, 20, 30, 45, 60]}
                      />
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-zinc-600">
                      Die Sperrschwelle wird automatisch mindestens eine Öffnung über der Warnschwelle gehalten.
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-blue-500/20 bg-blue-500/5 p-4" aria-label="Technischer Umfang">
            <div className="flex items-start gap-3">
              <Info size={17} className="mt-0.5 flex-shrink-0 text-blue-400" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-zinc-400">
                Diese Seite zeigt nur Regeln, die der aktuelle Android-v1-Schutzdienst tatsächlich auswertet. Reels-/Shorts-, Swipe- und Einzelinhalt-Erkennung bleiben aus der Release-Oberfläche entfernt, bis sie technisch zuverlässig umgesetzt sind.
              </p>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/60 p-4" aria-label="Lokale Verarbeitung">
            <div className="flex items-start gap-3">
              <Shield size={17} className="mt-0.5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-zinc-400">
                Regeln, Öffnungszähler und Notfallbegründungen bleiben lokal. Änderungen werden an den laufenden Android-Schutzdienst synchronisiert, sobald der native Schutz verfügbar ist.
              </p>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
