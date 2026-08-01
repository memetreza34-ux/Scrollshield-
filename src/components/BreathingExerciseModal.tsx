import React, { useState, useEffect } from 'react';
import { Wind, X, Heart, Droplet, Dumbbell, Coffee, CheckCircle2 } from 'lucide-react';

interface BreathingExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (alternativeChosen?: string) => void;
}

export const BreathingExerciseModal: React.FC<BreathingExerciseModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
}) => {
  const [phase, setPhase] = useState<'breathe_in' | 'hold' | 'breathe_out'>('breathe_in');
  const [cycle, setCycle] = useState(1);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPhase('breathe_in');
      setCycle(1);
      setIsDone(false);
      return;
    }

    if (isDone) return;

    const timer1 = setTimeout(() => {
      setPhase('hold');
      const timer2 = setTimeout(() => {
        setPhase('breathe_out');
        const timer3 = setTimeout(() => {
          if (cycle < 2) {
            setCycle(c => c + 1);
            setPhase('breathe_in');
          } else {
            setIsDone(true);
          }
        }, 4000);
        return () => clearTimeout(timer3);
      }, 3000);
      return () => clearTimeout(timer2);
    }, 4000);

    return () => clearTimeout(timer1);
  }, [isOpen, phase, cycle, isDone]);

  if (!isOpen) return null;

  const alternatives = [
    { icon: Droplet, label: 'Ein Glas kaltes Wasser trinken', color: 'text-cyan-400' },
    { icon: Dumbbell, label: '10 schnelle Kniebeugen machen', color: 'text-emerald-400' },
    { icon: Coffee, label: 'Ein tiefes Durchatmen am Fenster', color: 'text-violet-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/30 text-center relative overflow-hidden">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!isDone ? (
          <div className="py-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono">
              <Wind className="w-4 h-4" /> One Sec Achtsamkeits-Atemübung
            </div>

            {/* Breathing Animated Circle */}
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
              <div className={`w-36 h-36 rounded-full bg-gradient-to-tr from-cyan-500/30 via-violet-500/30 to-emerald-500/30 border border-cyan-400/40 flex items-center justify-center transition-all duration-[4000ms] ${
                phase === 'breathe_in' ? 'scale-125 shadow-2xl shadow-cyan-500/40' : phase === 'hold' ? 'scale-125 border-violet-400' : 'scale-90 shadow-none'
              }`}>
                <Heart className="w-12 h-12 text-cyan-300 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-bold text-white font-mono uppercase tracking-wider">
                {phase === 'breathe_in' ? 'Einatmen...' : phase === 'hold' ? 'Innehalten...' : 'Ausatmen...'}
              </div>
              <p className="text-xs text-slate-400">Zyklus {cycle} von 2</p>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-6 animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Sehr gut durchgeatmet!</h3>
              <p className="text-xs text-slate-400 mt-1">Wähle eine gesunde Alternative statt Social Media:</p>
            </div>

            <div className="space-y-2 text-left">
              {alternatives.map((alt, idx) => {
                const IconComp = alt.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => onCompleted(alt.label)}
                    className="w-full p-3.5 rounded-xl glass-card border border-slate-800 hover:border-cyan-500/40 flex items-center gap-3 text-sm text-slate-200 hover:text-white transition"
                  >
                    <IconComp className={`w-5 h-5 ${alt.color}`} />
                    <span>{alt.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onCompleted()}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition"
            >
              Schließen & Fokus bewahren
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
