import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, CloudOff, Lock, ScanLine, Shield, Smartphone, Sparkles, Target, UserRound } from 'lucide-react';
import { AppState, DEFAULT_APP_CONFIG, Screen, SUPPORTED_APPS } from '../types';

export function Welcome({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex min-h-full flex-col items-center justify-start pt-6 pb-7 px-7 text-center"
    >
      <div className="pointer-events-none absolute inset-x-8 top-12 h-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-40 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="flex flex-1 flex-col items-center justify-center pt-2">
        <div className="relative mb-6 h-28 w-28" aria-hidden="true">
          <div className="signal-ring absolute inset-0 rounded-[2.2rem] border border-emerald-400/20" />
          <div className="signal-ring absolute inset-2 rounded-[2rem] border border-blue-400/20" />
          <div className="signal-ring absolute inset-4 rounded-[1.8rem] border border-rose-400/20" />
          <div className="shield-aura absolute inset-5 rounded-[2.2rem] shadow-2xl shadow-emerald-950/60" />
          <div className="absolute inset-5 z-10 flex items-center justify-center">
            <Shield size={48} className="text-zinc-50 drop-shadow-lg" />
          </div>
          <div className="scanline absolute left-6 right-6 top-1/2 z-20 h-8 rounded-full border-y border-emerald-300/20 bg-emerald-300/10 blur-[1px]" />
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
          <Sparkles size={14} aria-hidden="true" />
          Private Webapp, kein Login-Stress
        </div>
        <h1 className="mb-3 text-4xl font-black leading-none text-zinc-50">ScrollShield</h1>
        <p className="mb-5 max-w-sm text-base font-medium leading-relaxed text-zinc-300">
          Ein ruhiger Schutzschirm gegen Autopilot-Scrolling. Erst Webapp, spaeter echte native App.
        </p>

        <div className="w-full max-w-xs space-y-2.5 rounded-2xl border border-zinc-800/50 bg-zinc-950/60 p-4 text-left shadow-inner">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">So startest du:</p>
          <div className="flex items-start gap-3">
            <UserRound size={16} className="mt-0.5 text-emerald-400" aria-hidden="true" />
            <div>
              <span className="block text-sm font-semibold text-emerald-100">Kein Konto verbinden</span>
              <span className="text-xs text-zinc-500">Alles bleibt lokal in dieser Webapp</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Smartphone size={18} className="mt-0.5 text-blue-400" aria-hidden="true" />
            <div>
              <span className="block text-sm font-semibold text-blue-100">App-Zugang begrenzen</span>
              <span className="text-xs text-zinc-500">Pausen erzwingen und App-Limits setzen</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Target size={18} className="mt-0.5 text-rose-400" aria-hidden="true" />
            <div>
              <span className="block text-sm font-semibold text-rose-100">Kurzvideo-Sog stoppen</span>
              <span className="text-xs text-zinc-500">Bewusste Stopps statt Endlos-Feed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 w-full space-y-3 pb-2">
        <button
          onClick={() => navigate('onboarding')}
          className="w-full rounded-[1.5rem] bg-zinc-100 py-3.5 font-bold text-zinc-950 shadow-lg shadow-zinc-100/10 transition-transform active:scale-[0.98]"
        >
          Loslegen
        </button>
        <button
          onClick={() => navigate('help')}
          className="w-full rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 py-3.5 font-semibold text-zinc-300 backdrop-blur-md transition-transform active:scale-[0.98]"
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
    else navigate('permissions');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex h-full flex-col justify-between p-6"
    >
      <div className="flex-1 overflow-y-auto pb-4 pt-8 scrollbar-hide">
        {step === 1 && (
          <div>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-rose-400/30 bg-rose-500/10 shadow-lg shadow-rose-950/30">
              <Target size={32} className="text-rose-300" aria-hidden="true" />
            </div>
            <h2 className="mb-3 text-center text-3xl font-bold tracking-tight">Ziele auswaehlen</h2>
            <p className="mb-8 text-center text-base text-zinc-400">
              Welche Apps ziehen dich am haeufigsten in Endlos-Feeds oder rauben dir Zeit?
            </p>
            <div className="space-y-3">
              {SUPPORTED_APPS.map((app) => {
                const selected = selectedApps.includes(app.id);
                return (
                  <button
                    key={app.id}
                    onClick={() =>
                      setSelectedApps((prev) => (selected ? prev.filter((id) => id !== app.id) : [...prev, app.id]))
                    }
                    className={`w-full rounded-[1.5rem] border p-4 transition-all ${
                      selected
                        ? 'border-emerald-400/40 bg-emerald-500/10 shadow-md shadow-emerald-950/30'
                        : 'border-zinc-800/50 bg-zinc-950/50 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="flex items-center gap-4">
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl shadow-inner ${app.color}`}
                          aria-hidden="true"
                        >
                          {app.icon}
                        </span>
                        <span className="px-2 font-semibold">{app.name}</span>
                      </span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                          selected ? 'border-zinc-100 bg-zinc-100 text-zinc-950' : 'border-zinc-700'
                        }`}
                        aria-hidden="true"
                      >
                        {selected && <Check size={14} strokeWidth={3} />}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-emerald-400/30 bg-emerald-500/10 shadow-lg shadow-emerald-950/30">
              <Shield size={32} className="text-emerald-300" aria-hidden="true" />
            </div>
            <h2 className="mb-3 text-center text-3xl font-bold tracking-tight">Start-Profil waehlen</h2>
            <p className="mb-6 text-center text-sm text-zinc-400">
              Das ist nur dein Startpunkt. Du kannst spaeter jede App und jeden Feed einzeln anpassen.
            </p>
            <div className="space-y-4">
              {state.profiles?.map((profile) => {
                const selected = selectedProfileId === profile.id;
                return (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`w-full rounded-[1.5rem] border p-5 text-left transition-all ${
                      selected
                        ? 'border-emerald-400/40 bg-zinc-900/90 shadow-lg'
                        : 'border-zinc-800/50 bg-zinc-950/50 hover:bg-zinc-900/50'
                    }`}
                  >
                    <span className="mb-2 flex items-center justify-between">
                      <span className="text-lg font-bold text-zinc-100">{profile.name}</span>
                      {selected && <Check size={16} className={profile.color} aria-hidden="true" />}
                    </span>
                    <span className="block text-sm leading-relaxed text-zinc-400">{profile.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 flex flex-col items-center text-center">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-zinc-800/50 bg-zinc-900/80 shadow-lg backdrop-blur-md">
              <Lock size={40} className="text-zinc-100" aria-hidden="true" />
            </div>
            <h2 className="mb-5 text-3xl font-bold tracking-tight">Privatsphaere & Schutz</h2>
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">
              Du musst dich nicht mit Instagram, TikTok, YouTube oder einem ScrollShield-Konto verbinden. Version 1
              startet bewusst lokal und ohne Login.
            </p>
            <div className="mb-4 w-full rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/10 p-5 text-left text-sm text-emerald-100 shadow-inner">
              <div className="mb-2 flex items-center gap-2 font-bold text-emerald-300">
                <CloudOff size={16} aria-hidden="true" />
                Offline-First in Version 1.0
              </div>
              Regeln, Verlauf und Statistiken bleiben auf deinem Geraet. ScrollShield liest keine Chats oder Passwoerter
              und uebertraegt keine Nutzungsdaten an Entwickler-Server.
            </div>
            <div className="w-full rounded-[1.5rem] border border-blue-500/30 bg-blue-500/10 p-5 text-left text-sm text-blue-200 shadow-inner">
              <div className="mb-2 flex items-center gap-2 font-bold text-blue-300">
                <ScanLine size={16} aria-hidden="true" />
                Webapp-Grenze ist ehrlich
              </div>
              Die Webversion kann andere Apps nicht direkt sperren. Sie hilft dir mit bewussten Pausen, Regeln,
              Fokuszeiten und klaren Unterbrechungen. Echte System-Sperren kommen spaeter in der nativen App.
            </div>
          </div>
        )}
      </div>

      <div className="bg-zinc-950 pt-4">
        <div className="mb-6 flex justify-center gap-2">
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
            className="flex w-16 items-center justify-center rounded-[1.5rem] border border-zinc-800 bg-zinc-900 py-4 text-zinc-400 shadow-lg transition-transform active:scale-[0.98]"
            aria-label="Zurueck"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={nextStep}
            className="flex-1 rounded-[1.5rem] bg-zinc-100 py-4 font-bold text-zinc-950 shadow-lg shadow-zinc-100/10 transition-transform active:scale-[0.98]"
          >
            {step < 3 ? 'Weiter' : 'Setup pruefen'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
