import { useState } from 'react';
import { motion } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { Play, Square, Clock, Shield, CheckCircle2 } from 'lucide-react';
import { AppState, FocusSchedule, Screen } from '../types';
import { Header, Switch } from '../components/ui';
import { createFocusEndUpdate, createFocusStartUpdate } from '../lib/focus';

const WEEKDAYS = [
  { value: 1, label: 'Mo', name: 'Montag' },
  { value: 2, label: 'Di', name: 'Dienstag' },
  { value: 3, label: 'Mi', name: 'Mittwoch' },
  { value: 4, label: 'Do', name: 'Donnerstag' },
  { value: 5, label: 'Fr', name: 'Freitag' },
  { value: 6, label: 'Sa', name: 'Samstag' },
  { value: 0, label: 'So', name: 'Sonntag' },
];

export function Focus({
  state,
  updateState,
  navigate: _navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const [selectedTime, setSelectedTime] = useState(25);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'timer' | 'schedule'>('timer');
  const focusProgressBase = Math.max(selectedTime, state.focusTimeRemaining, 1);

  const updateSchedule = (id: string, patch: Partial<FocusSchedule>) => {
    updateState({
      focusSchedules: state.focusSchedules.map((schedule) => {
        if (schedule.id !== id) return schedule;
        const next = { ...schedule, ...patch };
        return next.days.length === 0 || next.startTime === next.endTime ? { ...next, active: false } : next;
      }),
    });
  };

  const startFocus = () => {
    updateState(createFocusStartUpdate(state, selectedTime));
    setShowCancelConfirm(false);
  };

  const stopFocus = () => {
    updateState(createFocusEndUpdate(state, false));
    setShowCancelConfirm(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
      <Header title="Fokus-Sitzung" />

      <div className="w-full">
        {state.isFocusModeActive ? (
          <div className="flex flex-col items-center text-center w-full">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-72 aspect-square flex items-center justify-center mb-10"
            >
              <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-2xl">
                <defs>
                  <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <circle cx="144" cy="144" r="136" fill="none" stroke="#27272a" strokeWidth="6" />
                <motion.circle
                  cx="144"
                  cy="144"
                  r="136"
                  fill="none"
                  stroke="url(#emeraldGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '854', strokeDashoffset: '854' }}
                  animate={{ strokeDashoffset: 854 - 854 * (state.focusTimeRemaining / focusProgressBase) }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </svg>
              <div className="flex flex-col items-center z-10">
                <span className="text-6xl font-bold tracking-tighter font-mono text-zinc-50 drop-shadow-lg">
                  {state.focusTimeRemaining}
                </span>
                <span className="text-emerald-400/80 font-bold uppercase tracking-[0.2em] text-xs mt-2">
                  Minuten verbleibend
                </span>
              </div>
            </motion.div>

            <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-[1.5rem] p-5 mb-10 w-full flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/10 backdrop-blur-md">
              <Shield size={24} className="text-emerald-500 drop-shadow-md" />
              <span className="text-emerald-400 font-semibold tracking-wide">
                {Capacitor.isNativePlatform() ? 'Strikter Schutz aktiv' : 'Fokuszeit läuft'}
              </span>
            </div>

            {showCancelConfirm ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                <div className="bg-red-500/10 border border-red-500/20 rounded-[1.5rem] p-5 mb-4 backdrop-blur-md">
                  <h3 className="text-red-400 font-bold mb-1">Fokus wirklich abbrechen?</h3>
                  <p className="text-red-400/80 text-sm">
                    Dies unterbricht deine produktive Phase. Sicher, dass du schon aufgeben willst?
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 bg-zinc-800 text-zinc-100 font-bold py-4 rounded-2xl"
                  >
                    Weitermachen
                  </button>
                  <button
                    onClick={stopFocus}
                    className="flex-1 bg-red-500/20 text-red-400 font-bold py-4 rounded-2xl hover:bg-red-500/30"
                  >
                    Ja, abbrechen
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 text-zinc-400 font-bold py-4 rounded-[1.5rem] flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-zinc-800 shadow-inner"
              >
                <Square size={20} className="fill-zinc-500" /> Fokus abbrechen
              </button>
            )}
          </div>
        ) : (
          <div className="w-full">
            <div className="bg-zinc-900/80 p-1 flex rounded-2xl mb-5 border border-zinc-800/50">
              <button
                onClick={() => setActiveTab('timer')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'timer' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Einmaliger Timer
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'schedule' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Zeitpläne
              </button>
            </div>

            {activeTab === 'timer' ? (
              <>
                <div className="text-center mb-5">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#5b8c70] bg-[#244538] shadow-lg shadow-black/15">
                    <Clock size={25} className="text-[#b9e5c9]" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1 tracking-tight">Deep Work</h2>
                  <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
                    {Capacitor.isNativePlatform()
                      ? 'Starte deine Fokuszeit mit den gewählten Geräteeinstellungen.'
                      : 'Wähle eine Dauer und nimm dir bewusst Zeit ohne Scrollen.'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[15, 25, 45, 60, 90, 120].map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-3 rounded-2xl border transition-all font-bold text-xl shadow-sm ${selectedTime === time ? 'bg-[#dcebdd] text-[#14362b] border-[#e7f2df] shadow-[#b9e5c9]/15 scale-105' : 'bg-zinc-900/50 backdrop-blur-md border-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'}`}
                    >
                      {time}
                      <span
                        className={`block text-[10px] font-bold uppercase tracking-widest mt-1 ${selectedTime === time ? 'text-[#416954]' : 'text-zinc-600'}`}
                      >
                        Min
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={startFocus}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#b9e5c9] py-4 font-bold text-[#14362b] shadow-lg shadow-[#b9e5c9]/15 transition-all hover:bg-[#dcebdd] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9e5c9] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  <Play size={20} className="fill-[#14362b] text-[#14362b]" /> {selectedTime} Min Fokus starten
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-100">Feste Zeiten</h2>
                    <p className="text-sm text-zinc-400 mt-1">Zeiten und Tage werden automatisch gespeichert.</p>
                  </div>
                </div>

                <p className="rounded-2xl border border-[#344c3e] bg-[#1b2b23] p-4 text-sm leading-relaxed text-[#d0e4d3]">
                  Automatischer Start nur, wenn ScrollShield im Vordergrund ist. Öffnest du die App später im
                  Zeitfenster, startet nur die Restzeit. Im Hintergrund gibt es keinen Start.
                </p>

                {state.focusSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`rounded-2xl border bg-zinc-900/80 p-5 transition-colors ${schedule.active ? 'border-[#638675] shadow-lg' : 'border-zinc-800/50'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="mb-1 text-lg font-bold text-zinc-100">{schedule.name}</h3>
                        <p className="text-xs text-zinc-400">{schedule.active ? 'Aktiv' : 'Pausiert'}</p>
                      </div>
                      <Switch
                        checked={schedule.active}
                        ariaLabel={`Zeitplan ${schedule.name}`}
                        onChange={(active) => updateSchedule(schedule.id, { active })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs font-semibold text-zinc-300">
                        Beginn
                        <input
                          type="time"
                          aria-label={`${schedule.name}: Beginn`}
                          value={schedule.startTime}
                          onChange={(event) => updateSchedule(schedule.id, { startTime: event.target.value })}
                          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9e5c9]"
                        />
                      </label>
                      <label className="text-xs font-semibold text-zinc-300">
                        Ende
                        <input
                          type="time"
                          aria-label={`${schedule.name}: Ende`}
                          value={schedule.endTime}
                          onChange={(event) => updateSchedule(schedule.id, { endTime: event.target.value })}
                          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9e5c9]"
                        />
                      </label>
                    </div>
                    <div
                      className="mt-4 grid grid-cols-7 gap-1"
                      role="group"
                      aria-label={`${schedule.name}: Wochentage`}
                    >
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.value}
                          onClick={() =>
                            updateSchedule(schedule.id, {
                              days: schedule.days.includes(day.value)
                                ? schedule.days.filter((value) => value !== day.value)
                                : [...schedule.days, day.value],
                            })
                          }
                          aria-label={`${schedule.name}: ${day.name}`}
                          aria-pressed={schedule.days.includes(day.value)}
                          className={`min-w-0 rounded-lg px-0.5 py-2 text-[11px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9e5c9] ${schedule.days.includes(day.value) ? 'bg-[#b9e5c9] text-[#14362b]' : 'bg-zinc-800 text-zinc-300'}`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    {schedule.startTime === schedule.endTime && (
                      <p className="mt-3 text-xs text-amber-300">Beginn und Ende müssen verschieden sein.</p>
                    )}
                    {schedule.days.length === 0 && (
                      <p className="mt-3 text-xs text-amber-300">Wähle mindestens einen Wochentag.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function FocusResult({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const session = state.focusSessions.find((item) => item.id === state.pendingFocusResultId && item.endTime !== null);
  const seconds = session?.endTime
    ? Math.max(0, Math.min(session.duration * 60, Math.floor((session.endTime - session.startTime) / 1000)))
    : 0;
  const measuredTime = seconds < 60 ? `${seconds} Sek` : `${Math.floor(seconds / 60)} Min`;

  const closeResult = () => {
    updateState({ pendingFocusResultId: null });
    navigate('dashboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-full flex-col justify-center p-6 pb-10"
    >
      <section aria-labelledby="focus-result-title" className="rounded-[2rem] bg-[#dcebdd] p-7 text-[#14362b]">
        <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#b9d9be]" aria-hidden="true">
          {session?.successful ? <CheckCircle2 size={29} /> : <Clock size={29} />}
        </span>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#366d56]">Deine Fokuszeit</p>
        <h1 id="focus-result-title" className="font-display text-[30px] font-bold leading-tight tracking-tight">
          {session?.successful ? 'Fokus geschafft.' : 'Fokus beendet.'}
        </h1>
        <p className="mt-5 font-display text-[58px] font-bold leading-none tabular-nums tracking-tight">
          {measuredTime}
        </p>
        <p className="mt-2 text-sm text-[#345847]">
          {session
            ? `Von ${session.duration} geplanten Minuten ${session.successful ? 'abgeschlossen' : 'erreicht'}.`
            : 'Es liegt keine abgeschlossene Fokuszeit vor.'}
        </p>
        <button
          onClick={closeResult}
          className="mt-8 w-full rounded-2xl bg-[#173f32] px-5 py-4 font-bold text-[#f3f8ef] hover:bg-[#265a45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173f32] focus-visible:ring-offset-2 focus-visible:ring-offset-[#dcebdd]"
        >
          Zum Dashboard
        </button>
      </section>
    </motion.div>
  );
}
