import React, { useState, useEffect } from 'react';
import { brainEngine } from '../lib/aiBrainEngine';
import { Brain, X, Check, Sparkles, ArrowRight } from 'lucide-react';

interface AICoachingModalProps {
  appName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmOutcome: (outcome: 'reflection_canceled' | 'delayed_opened' | 'blocked', userText?: string) => void;
}

export const AICoachingModal: React.FC<AICoachingModalProps> = ({
  appName,
  isOpen,
  onClose,
  onConfirmOutcome,
}) => {
  const [countdown, setCountdown] = useState(15);
  const [userReason, setUserReason] = useState('');
  const [question, setQuestion] = useState('');
  const [step, setStep] = useState<'countdown' | 'reflection' | 'choice'>('countdown');

  useEffect(() => {
    if (isOpen) {
      setCountdown(15);
      setStep('countdown');
      setUserReason('');
      setQuestion(brainEngine.generateReflectionQuestion(appName));
    }
  }, [isOpen, appName]);

  useEffect(() => {
    if (!isOpen || step !== 'countdown') return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setStep('reflection');
    }
  }, [isOpen, countdown, step]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        
        {/* Glowing background aura */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">ScrollShield KI-Pause</h3>
              <p className="text-xs text-slate-400">Verlangen-Verzögerung für <span className="text-cyan-400 font-semibold">{appName}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Countdown Timer */}
        {step === 'countdown' && (
          <div className="text-center py-6 space-y-6">
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
              <div
                className="absolute inset-0 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin"
                style={{ animationDuration: '4s' }}
              ></div>
              <div className="text-center">
                <span className="text-4xl font-extrabold text-white font-mono">{countdown}</span>
                <span className="block text-xs text-slate-400 uppercase tracking-widest mt-1">Sekunden</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-base font-semibold text-slate-200">Atme tief durch.</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Diese kurze Unterbrechung gibt deinem präfrontalen Kortex Zeit, die Führung zu übernehmen.
              </p>
            </div>

            <button
              onClick={() => onConfirmOutcome('reflection_canceled', 'Achtsam abgebrochen während der Pause')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition"
            >
              🛑 Ich verzichte doch (App schließen)
            </button>
          </div>
        )}

        {/* Step 2: AI Reflection Prompt */}
        {step === 'reflection' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-sm flex gap-3 items-start">
              <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-cyan-300 block mb-1">KI-Reflexions-Frage:</span>
                "{question}"
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Deine kurze Absicht (optional):
              </label>
              <textarea
                value={userReason}
                onChange={(e) => setUserReason(e.target.value)}
                placeholder="z.B. Ich muss eine bestimmte Nachricht abrufen..."
                className="w-full h-24 p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition resize-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => onConfirmOutcome('reflection_canceled', userReason || 'Achtsame Entscheidung dagegen')}
                className="py-3 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Check className="w-4 h-4" /> Nicht öffnen & Fokus bewahren
              </button>

              <button
                onClick={() => onConfirmOutcome('delayed_opened', userReason || 'Nach Bedenkzeit geöffnet')}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <ArrowRight className="w-4 h-4" /> Trotzdem 5 Min. öffnen
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
