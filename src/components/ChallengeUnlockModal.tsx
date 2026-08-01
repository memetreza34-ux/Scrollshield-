import React, { useState } from 'react';
import { ShieldAlert, X, Check, Lock, RefreshCw, KeyRound } from 'lucide-react';

interface ChallengeUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}

export const ChallengeUnlockModal: React.FC<ChallengeUnlockModalProps> = ({
  isOpen,
  onClose,
  onUnlocked,
}) => {
  const challengePhrase = "Ich entscheide mich bewusst für meinen Fokus";
  const [typedInput, setTypedInput] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedInput.trim().toLowerCase() === challengePhrase.toLowerCase()) {
      onUnlocked();
      setTypedInput('');
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 border border-rose-500/30 relative overflow-hidden">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Notfall-Challenge (ScreenZen)</h3>
              <p className="text-xs text-slate-400">Verhindert impulsiven Abbruch des Schutzes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/20 text-xs text-rose-200">
            🔒 Um eine Notfall-Freigabe zu erhalten, tippe folgenden Satz exakt ab:
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-center font-mono text-sm text-cyan-300 select-none">
            "{challengePhrase}"
          </div>

          <form onSubmit={handleVerify} className="space-y-3">
            <input
              type="text"
              value={typedInput}
              onChange={(e) => {
                setTypedInput(e.target.value);
                setError(false);
              }}
              placeholder="Satz hier tippen..."
              className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500 transition"
            />

            {error && (
              <p className="text-xs text-rose-400 font-semibold">
                ⚠️ Der Satz stimmt noch nicht überein. Bitte genau prüfen.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Abbrechen (Fokus halten)
              </button>

              <button
                type="submit"
                className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 flex items-center justify-center gap-1.5 transition"
              >
                <Lock className="w-4 h-4" /> Freischalten
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
