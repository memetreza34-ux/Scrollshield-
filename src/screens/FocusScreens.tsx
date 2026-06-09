import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Square, Clock, Shield, Calendar, Edit3, Plus } from 'lucide-react';
import { AppState, Screen } from '../types';
import { Header, Switch, TimeSelector } from '../components/ui';

export function Focus({ state, updateState, navigate }: { state: AppState, updateState: (u: Partial<AppState>) => void, navigate: (s: Screen) => void }) {
  const [selectedTime, setSelectedTime] = useState(25);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'timer' | 'schedule'>('timer');
  const [schedules, setSchedules] = useState([
    { id: '1', name: 'Arbeit / Deep Work', days: ['Mo', 'Di', 'Mi', 'Do', 'Fr'], start: '09:00', end: '12:00', active: true, color: 'emerald' },
    { id: '2', name: 'Digital Detox / Schlaf', days: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], start: '22:30', end: '07:00', active: false, color: 'indigo' },
  ]);

  // Mock timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.isFocusModeActive && state.focusTimeRemaining > 0) {
      interval = setInterval(() => {
        updateState({ focusTimeRemaining: state.focusTimeRemaining - 1 });
      }, 60000); // decrement every minute
    } else if (state.isFocusModeActive && state.focusTimeRemaining <= 0) {
      updateState({ 
        isFocusModeActive: false,
        history: [
          { id: Date.now().toString(), timestamp: Date.now(), type: 'focus_end', desc: `Fokus-Sitzung erfolgreich beendet.` },
          ...(state.history || [])
        ]
      });
      setShowCancelConfirm(false);
    }
    return () => clearInterval(interval);
  }, [state.isFocusModeActive, state.focusTimeRemaining, updateState, state.history]);

  const startFocus = () => {
    updateState({ 
      isFocusModeActive: true, 
      focusTimeRemaining: selectedTime,
      history: [
        { id: Date.now().toString(), timestamp: Date.now(), type: 'focus_start', desc: `${selectedTime} Min. Fokus-Sitzung gestartet.` },
        ...(state.history || [])
      ]
    });
    setShowCancelConfirm(false);
  };

  const stopFocus = () => {
    updateState({ 
      isFocusModeActive: false, 
      focusTimeRemaining: 0,
      history: [
        { id: Date.now().toString(), timestamp: Date.now(), type: 'focus_end', desc: `Fokus-Sitzung vorzeitig abgebrochen.` },
        ...(state.history || [])
      ]
    });
    setShowCancelConfirm(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-24 flex flex-col h-full">
      <Header title="Fokus-Sitzung" />

      <div className="flex-1 flex flex-col items-center justify-center">
        {state.isFocusModeActive ? (
          <div className="flex flex-col items-center text-center w-full">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="relative w-72 h-72 flex items-center justify-center mb-10"
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
                  cx="144" cy="144" r="136" fill="none" stroke="url(#emeraldGradient)" strokeWidth="12" strokeLinecap="round"
                  initial={{ strokeDasharray: "854", strokeDashoffset: "854" }}
                  animate={{ strokeDashoffset: 854 - (854 * (state.focusTimeRemaining / selectedTime)) }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </svg>
              <div className="flex flex-col items-center z-10">
                <span className="text-8xl font-bold tracking-tighter font-mono text-zinc-50 drop-shadow-lg">{state.focusTimeRemaining}</span>
                <span className="text-emerald-400/80 font-bold uppercase tracking-[0.2em] text-xs mt-2">Minuten verbleibend</span>
              </div>
            </motion.div>

            <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-[1.5rem] p-5 mb-10 w-full flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/10 backdrop-blur-md">
              <Shield size={24} className="text-emerald-500 drop-shadow-md" />
              <span className="text-emerald-400 font-semibold tracking-wide">Strikter Schutz aktiv</span>
            </div>

            {showCancelConfirm ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                <div className="bg-red-500/10 border border-red-500/20 rounded-[1.5rem] p-5 mb-4 backdrop-blur-md">
                  <h3 className="text-red-400 font-bold mb-1">Fokus wirklich abbrechen?</h3>
                  <p className="text-red-400/80 text-sm">Dies unterbricht deine produktive Phase. Sicher, dass du schon aufgeben willst?</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCancelConfirm(false)} className="flex-1 bg-zinc-800 text-zinc-100 font-bold py-4 rounded-2xl">Weitermachen</button>
                  <button onClick={stopFocus} className="flex-1 bg-red-500/20 text-red-400 font-bold py-4 rounded-2xl hover:bg-red-500/30">Ja, abbrechen</button>
                </div>
              </motion.div>
            ) : (
              <button onClick={() => setShowCancelConfirm(true)} className="w-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 text-zinc-400 font-bold py-4 rounded-[1.5rem] flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-zinc-800 shadow-inner">
                <Square size={20} className="fill-zinc-500" /> Fokus abbrechen
              </button>
            )}
          </div>
        ) : (
          <div className="w-full">
            <div className="bg-zinc-900/80 p-1 flex rounded-2xl mb-8 border border-zinc-800/50">
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
                <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-900/20 border border-emerald-500/30">
                    <Clock size={32} className="text-emerald-400 drop-shadow-md" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3 tracking-tight">Deep Work</h2>
                  <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
                    Arbeite ungestört. Alle ausgewählten Apps werden sofort strikt blockiert.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-10">
                  {[15, 25, 45, 60, 90, 120].map(time => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-5 rounded-2xl border transition-all font-bold text-xl shadow-sm ${selectedTime === time ? 'bg-emerald-500 text-emerald-950 border-emerald-400 shadow-emerald-500/20 scale-105' : 'bg-zinc-900/50 backdrop-blur-md border-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'}`}
                    >
                      {time}
                      <span className={`block text-[10px] font-bold uppercase tracking-widest mt-1 ${selectedTime === time ? 'text-emerald-900/80' : 'text-zinc-600'}`}>Min</span>
                    </button>
                  ))}
                </div>

                <button onClick={startFocus} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-emerald-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20">
                  <Play size={20} className="fill-emerald-950 text-emerald-950" /> Fokus starten
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-100">Feste Zeiten</h2>
                    <p className="text-sm text-zinc-400 mt-1">Automatisch blockieren.</p>
                  </div>
                  <button className="w-10 h-10 bg-zinc-800 text-zinc-100 rounded-full flex items-center justify-center hover:bg-zinc-700 transition-colors">
                    <Plus size={20} />
                  </button>
                </div>
                
                {schedules.map(schedule => (
                  <div key={schedule.id} className={`bg-zinc-900/80 border rounded-2xl p-5 transition-colors ${schedule.active ? 'border-zinc-700 shadow-lg' : 'border-zinc-800/50 opacity-70'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`font-bold text-lg mb-1 ${schedule.active ? 'text-zinc-100' : 'text-zinc-400'}`}>{schedule.name}</h3>
                        <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">{schedule.start} - {schedule.end} Uhr</p>
                      </div>
                      <Switch 
                        checked={schedule.active} 
                        onChange={(c) => setSchedules(schedules.map(s => s.id === schedule.id ? { ...s, active: c } : s))} 
                      />
                    </div>
                    <div className="flex gap-1">
                      {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                        <div 
                          key={day} 
                          className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-md ${schedule.days.includes(day) ? (schedule.active ? `bg-${schedule.color}-500/20 text-${schedule.color}-400` : 'bg-zinc-800 text-zinc-400') : 'text-zinc-600'}`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
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
