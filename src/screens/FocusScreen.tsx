import { AlertTriangle, Play, Shield, Square } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { createFocusEndUpdate, createFocusStartUpdate } from '../lib/focus';
import type { AppState, Screen } from '../types';
import { Header } from '../components/ui';

export function FocusScreen({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  navigate: (screen: Screen) => void;
}) {
  const [selectedMinutes, setSelectedMinutes] = useState(state.settings.defaultFocusDuration || 25);
  const [confirmStop, setConfirmStop] = useState(false);

  const focusConfiguredApps = Object.values(state.appsConfig).filter(
    (config) => config.active && config.focusModeBehavior !== 'allow',
  );
  const blockingApps = focusConfiguredApps.filter((config) => config.focusModeBehavior === 'block').length;
  const warningApps = focusConfiguredApps.filter((config) => config.focusModeBehavior === 'warn').length;

  const startFocus = () => {
    updateState(createFocusStartUpdate(state, selectedMinutes));
    setConfirmStop(false);
  };

  const stopFocus = () => {
    updateState(createFocusEndUpdate(state, false));
    setConfirmStop(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
      <Header title="Fokus" />

      {state.isFocusModeActive ? (
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-7 text-center" aria-labelledby="focus-running-title">
            <Shield size={30} className="mx-auto text-emerald-400" aria-hidden="true" />
            <h2 id="focus-running-title" className="mt-4 text-sm font-bold uppercase tracking-widest text-emerald-400">
              Fokusregeln aktiv
            </h2>
            <div className="mt-4 text-6xl font-mono font-bold tracking-tighter text-zinc-50" aria-label={`Noch ${state.focusTimeRemaining} Minuten`}>
              {state.focusTimeRemaining}
              <span className="text-2xl text-emerald-400/70">m</span>
            </div>
            <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-zinc-400">
              Während dieser Sitzung wendet ScrollShield pro geschützter App genau das konfigurierte Fokusverhalten an.
            </p>
          </section>

          <section className="grid grid-cols-2 gap-3" aria-label="Fokusregeln">
            <div className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5 text-center">
              <div className="text-3xl font-mono font-bold text-zinc-100">{blockingApps}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Blockieren</div>
            </div>
            <div className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5 text-center">
              <div className="text-3xl font-mono font-bold text-zinc-100">{warningApps}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Warnen</div>
            </div>
          </section>

          {confirmStop ? (
            <section className="rounded-[1.5rem] border border-red-500/25 bg-red-500/10 p-5">
              <h2 className="font-bold text-red-300">Fokus wirklich beenden?</h2>
              <p className="mt-1 text-sm leading-relaxed text-red-200/70">
                Die Fokusregeln werden sofort deaktiviert. Deine normalen App-Regeln bleiben bestehen.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmStop(false)}
                  className="min-h-[48px] rounded-xl bg-zinc-800 text-sm font-bold text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Weiter fokussieren
                </button>
                <button
                  type="button"
                  onClick={stopFocus}
                  className="min-h-[48px] rounded-xl bg-red-500/20 text-sm font-bold text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  Fokus beenden
                </button>
              </div>
            </section>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmStop(true)}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[1.5rem] border border-zinc-800 bg-zinc-900 text-sm font-bold text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Square size={17} aria-hidden="true" /> Fokus beenden
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-zinc-800/50 bg-zinc-900/80 p-6 text-center">
            <Shield size={30} className="mx-auto text-emerald-400" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold text-zinc-100">Fokus-Sitzung starten</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
              Der Fokusmodus ist ein zusätzlicher Zustand. Jede aktive App entscheidet über ihr eigenes Fokusverhalten: erlauben, warnen oder blockieren.
            </p>
          </section>

          <section aria-labelledby="focus-duration-title">
            <h2 id="focus-duration-title" className="mb-3 px-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Dauer
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[15, 25, 45, 60, 90, 120].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={selectedMinutes === minutes}
                  onClick={() => setSelectedMinutes(minutes)}
                  className={`min-h-[64px] rounded-2xl border text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    selectedMinutes === minutes
                      ? 'border-emerald-400 bg-emerald-500 text-emerald-950'
                      : 'border-zinc-800/50 bg-zinc-900/70 text-zinc-300'
                  }`}
                >
                  {minutes}
                  <span className="ml-1 text-[10px] uppercase">Min</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/70 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-400" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">Vor dem Start prüfen</h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Aktuell reagieren {blockingApps} App{blockingApps === 1 ? '' : 's'} mit Blockieren und {warningApps} mit Warnen. Apps mit „Erlauben“ werden durch Fokus nicht zusätzlich eingeschränkt.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('apps')}
                  className="mt-3 text-xs font-bold text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  App-Fokusregeln prüfen →
                </button>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={startFocus}
            className="flex min-h-[56px] w-full items-center justify-center gap-3 rounded-[1.5rem] bg-emerald-500 text-base font-bold text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Play size={19} aria-hidden="true" /> Fokus für {selectedMinutes} Minuten starten
          </button>

          <p className="px-2 text-xs leading-relaxed text-zinc-600">
            Wiederkehrende Fokus-Zeitpläne werden erst angeboten, wenn sie persistent gespeichert und vom nativen Android-Schutzdienst zuverlässig ausgeführt werden. Die alten Demo-Zeitpläne sind aus dem Release-Pfad entfernt.
          </p>
        </div>
      )}
    </motion.div>
  );
}
