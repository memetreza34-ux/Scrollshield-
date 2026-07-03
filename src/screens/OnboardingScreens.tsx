import { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Smartphone, Target, Lock, Check } from 'lucide-react';
import { AppState, Screen, SUPPORTED_APPS, DEFAULT_APP_CONFIG } from '../types';

export function Welcome({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full p-8 justify-center items-center text-center"
    >
      <div className="flex-1 flex flex-col items-center justify-center pt-8">
        <div className="w-28 h-28 bg-zinc-900/80 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-black/50 border border-zinc-800/50">
          <Shield size={56} className="text-zinc-100 drop-shadow-md" />
        </div>
        <h1 className="text-4xl font-bold mb-4 tracking-tight">ScrollShield</h1>
        <p className="text-zinc-300 leading-relaxed text-lg max-w-sm font-medium mb-6">
          Du willst Social Media nutzen, aber nicht in Reels, Shorts und Endlos-Scroll verschwinden.
        </p>

        <div className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/50 text-left w-full max-w-xs space-y-3 shadow-inner">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Die 2 Schutzebenen:</p>
          <div className="flex items-start gap-3">
            <Smartphone size={18} className="text-emerald-400 mt-0.5" />
            <div>
              <span className="text-sm font-semibold text-emerald-100 block">App-Zugang begrenzen</span>
              <span className="text-xs text-zinc-500">Pausen erzwingen & App-Limits</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Target size={18} className="text-blue-400 mt-0.5" />
            <div>
              <span className="text-sm font-semibold text-blue-100 block">Kurzvideo-Sog stoppen</span>
              <span className="text-xs text-zinc-500">Endlos-Feeds explizit blockieren</span>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full space-y-4 pb-8 mt-8">
        <button
          onClick={() => navigate('onboarding')}
          className="w-full bg-zinc-100 text-zinc-950 font-bold py-4 rounded-[1.5rem] active:scale-[0.98] transition-transform shadow-lg shadow-zinc-100/10"
        >
          Loslegen
        </button>
        <button
          onClick={() => navigate('help')}
          className="w-full bg-zinc-900/80 backdrop-blur-md text-zinc-300 font-semibold py-4 rounded-[1.5rem] active:scale-[0.98] transition-transform border border-zinc-800/50"
        >
          Mehr erfahren
        </button>
      </div>
    </motion.div>
  );
}

export function Onboarding({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const [step, setStep] = useState(1);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(state.activeProfileId || 'gentle');

  const nextStep = () => {
    if (step === 2) {
      // Apply the selected profile's config to the selected apps
      const appsConfig = { ...state.appsConfig };
      const selectedProfile = state.profiles?.find((p) => p.id === selectedProfileId);

      selectedApps.forEach((id) => {
        if (selectedProfile && selectedProfile.appsConfig[id]) {
          appsConfig[id] = { ...selectedProfile.appsConfig[id], active: true };
        } else {
          appsConfig[id] = { id, ...DEFAULT_APP_CONFIG, active: true };
        }
      });
      updateState({ appsConfig, activeProfileId: selectedProfileId });
    }

    if (step < 3) setStep(step + 1);
    else {
      navigate('permissions');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full p-6 justify-between"
    >
      <div className="flex-1 overflow-y-auto scrollbar-hide pt-8 pb-4">
        {step === 1 && (
          <div>
            <div className="w-20 h-20 bg-zinc-900/80 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center mb-6 shadow-lg border border-zinc-800/50 mx-auto">
              <Target size={32} className="text-red-400" />
            </div>
            <h2 className="text-3xl font-bold mb-3 text-center tracking-tight">Ziele auswählen</h2>
            <p className="text-zinc-400 text-center mb-8 text-base">
              Welche Apps ziehen dich am häufigsten in Endlos-Feeds oder rauben dir Zeit?
            </p>
            <div className="space-y-3">
              {SUPPORTED_APPS.map((app) => (
                <button
                  key={app.id}
                  onClick={() =>
                    setSelectedApps((prev) =>
                      prev.includes(app.id) ? prev.filter((id) => id !== app.id) : [...prev, app.id],
                    )
                  }
                  className={`w-full flex items-center justify-between p-4 rounded-[1.5rem] border transition-all ${selectedApps.includes(app.id) ? 'bg-zinc-900/80 border-zinc-700 shadow-md' : 'bg-zinc-950/50 border-zinc-800/50 opacity-80 hover:opacity-100'}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${app.color}`}
                    >
                      {app.icon}
                    </div>
                    <span className="font-semibold px-2">{app.name}</span>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center ${selectedApps.includes(app.id) ? 'bg-zinc-100 border-zinc-100 text-zinc-950' : 'border-zinc-700'}`}
                  >
                    {selectedApps.includes(app.id) && <Check size={14} strokeWidth={3} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="w-20 h-20 bg-zinc-900/80 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center mb-6 shadow-lg border border-zinc-800/50 mx-auto">
              <Shield size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold mb-3 text-center tracking-tight">Start-Profil wählen</h2>
            <p className="text-zinc-400 text-center mb-6 text-sm">
              Dies ist nur der Startpunkt. Du kannst für jede App und jeden Reels-Feed die Regeln später individuell
              anpassen.
            </p>
            <div className="space-y-4">
              {state.profiles?.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setSelectedProfileId(profile.id)}
                  className={`w-full text-left p-5 rounded-[1.5rem] border transition-all ${selectedProfileId === profile.id ? 'bg-zinc-900/90 border-zinc-600 shadow-lg' : 'bg-zinc-950/50 border-zinc-800/50 hover:bg-zinc-900/50'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-zinc-100 text-lg">{profile.name}</h3>
                    </div>
                    {selectedProfileId === profile.id && <Check size={16} className={profile.color} />}
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-3">{profile.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center text-center mt-6">
            <div className="w-24 h-24 bg-zinc-900/80 backdrop-blur-md rounded-[2rem] flex items-center justify-center mb-8 shadow-lg border border-zinc-800/50">
              <Lock size={40} className="text-zinc-100" />
            </div>
            <h2 className="text-3xl font-bold mb-5 tracking-tight">Privatsphäre & Schutz</h2>
            <p className="text-zinc-400 leading-relaxed text-sm mb-6">
              Damit die 2-Ebenen-Abwehr (App-Sperren + Kurzvideo-Erkennung) funktioniert, muss ScrollShield dein
              Verhalten auf dem Smartphone analysieren.
            </p>
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5 text-sm text-zinc-400 text-left w-full shadow-inner mb-4">
              <strong className="text-zinc-200 block mb-1">Offline-First in Version 1.0:</strong>
              Regeln, Verlauf und Statistiken bleiben in dieser Version auf deinem Gerät. ScrollShield liest keine Chats
              oder Passwörter und überträgt keine Nutzungsdaten an Entwickler-Server.
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-[1.5rem] p-5 text-sm text-blue-300/80 text-left w-full shadow-inner">
              <strong className="text-blue-400 block mb-1">Transparente Schutzregeln:</strong>
              Vor der Aktivierung siehst du, welche Limits gelten und ob dein gewähltes Profil eine Notfallfreigabe
              erlaubt.
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 bg-zinc-950">
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-zinc-100' : 'w-2 bg-zinc-800'}`}
            />
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate('welcome'))}
            className="w-16 flex items-center justify-center bg-zinc-900 text-zinc-400 py-4 rounded-[1.5rem] active:scale-[0.98] transition-transform shadow-lg border border-zinc-800"
            aria-label="Zurück"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={nextStep}
            className="flex-1 bg-zinc-100 text-zinc-950 font-bold py-4 rounded-[1.5rem] active:scale-[0.98] transition-transform shadow-lg shadow-zinc-100/10"
          >
            {step < 3 ? 'Weiter' : 'Berechtigungen erteilen'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
