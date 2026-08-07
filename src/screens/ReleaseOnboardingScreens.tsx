import { useState } from 'react';
import { Check, Lock, Shield, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import { getReleaseProfileConfig, getReleaseProfilePresentation } from '../lib/releaseProfiles';
import type { AppState, Screen } from '../types';
import { DEFAULT_APP_CONFIG, SUPPORTED_APPS } from '../types';

export function ReleaseWelcome({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full flex-col items-center justify-center p-8 text-center"
    >
      <div className="flex flex-1 flex-col items-center justify-center pt-8">
        <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-[2.5rem] border border-zinc-800/50 bg-zinc-900/80 shadow-2xl shadow-black/50">
          <Shield size={56} className="text-zinc-100" aria-hidden="true" />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">ScrollShield</h1>
        <p className="max-w-sm text-lg font-medium leading-relaxed text-zinc-300">
          Unterbrich impulsive App-Öffnungen, setze klare Limits und entscheide bewusster, bevor Zeit in geschützten Apps verschwindet.
        </p>

        <div className="mt-7 w-full max-w-xs space-y-3 rounded-2xl border border-zinc-800/50 bg-zinc-950/60 p-5 text-left">
          <div className="flex items-start gap-3">
            <Smartphone size={18} className="mt-0.5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
            <div>
              <span className="block text-sm font-semibold text-emerald-100">Ganze Apps bewusst öffnen</span>
              <span className="text-xs leading-relaxed text-zinc-500">Öffnungspause, Session-Länge, Tageslimit und Anti-Binge.</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Lock size={18} className="mt-0.5 flex-shrink-0 text-blue-400" aria-hidden="true" />
            <div>
              <span className="block text-sm font-semibold text-blue-100">Strikt, wenn du es brauchst</span>
              <span className="text-xs leading-relaxed text-zinc-500">Fokusregeln, Sperrfenster und begrenzter Notfallzugang.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 w-full space-y-3 pb-8">
        <button
          type="button"
          onClick={() => navigate('onboarding')}
          className="w-full rounded-[1.5rem] bg-zinc-100 py-4 font-bold text-zinc-950 shadow-lg shadow-zinc-100/10 active:scale-[0.98]"
        >
          Loslegen
        </button>
        <button
          type="button"
          onClick={() => navigate('help')}
          className="w-full rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 py-4 font-semibold text-zinc-300 active:scale-[0.98]"
        >
          Was kann Version 1?
        </button>
      </div>
    </motion.div>
  );
}

export function ReleaseOnboarding({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  navigate: (screen: Screen) => void;
}) {
  const [step, setStep] = useState(1);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState(state.activeProfileId || 'gentle');

  const canContinue = step !== 1 || selectedApps.length > 0;

  const applySelection = () => {
    const selectedProfile = state.profiles?.find((profile) => profile.id === selectedProfileId);
    const appsConfig = { ...state.appsConfig };
    const updatedAt = Date.now();

    for (const appId of selectedApps) {
      const source = selectedProfile?.appsConfig[appId] || {
        id: appId,
        ...DEFAULT_APP_CONFIG,
      };
      appsConfig[appId] = {
        ...getReleaseProfileConfig(selectedProfileId, { ...source, id: appId, active: true }),
        active: true,
        updatedAt,
      };
    }

    updateState({ appsConfig, activeProfileId: selectedProfileId });
  };

  const nextStep = () => {
    if (!canContinue) return;
    if (step === 2) applySelection();
    if (step < 3) setStep((current) => current + 1);
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
          <section>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80">
              <Smartphone size={32} className="text-emerald-400" aria-hidden="true" />
            </div>
            <h1 className="text-center text-3xl font-bold tracking-tight">Apps auswählen</h1>
            <p className="mx-auto mb-8 mt-3 max-w-sm text-center text-sm leading-relaxed text-zinc-400">
              Wähle mindestens eine App. Version 1 schützt die gesamte ausgewählte App; einzelne Reels, Shorts oder Feed-Bereiche werden nicht separat erkannt.
            </p>

            <div className="space-y-3">
              {SUPPORTED_APPS.map((app) => {
                const selected = selectedApps.includes(app.id);
                return (
                  <button
                    key={app.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setSelectedApps((current) =>
                        selected ? current.filter((appId) => appId !== app.id) : [...current, app.id],
                      )
                    }
                    className={`flex w-full items-center justify-between rounded-[1.5rem] border p-4 text-left ${selected ? 'border-zinc-700 bg-zinc-900/80' : 'border-zinc-800/50 bg-zinc-950/50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${app.color}`} aria-hidden="true">
                        {app.icon}
                      </div>
                      <span className="font-semibold">{app.name}</span>
                    </div>
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected ? 'border-zinc-100 bg-zinc-100 text-zinc-950' : 'border-zinc-700'}`} aria-hidden="true">
                      {selected && <Check size={14} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80">
              <Shield size={32} className="text-blue-400" aria-hidden="true" />
            </div>
            <h1 className="text-center text-3xl font-bold tracking-tight">Startprofil wählen</h1>
            <p className="mx-auto mb-7 mt-3 max-w-sm text-center text-sm leading-relaxed text-zinc-400">
              Das Profil setzt nur unterstützte Ganz-App-Regeln als Startpunkt. Jede geschützte App kann danach einzeln angepasst werden.
            </p>

            <div className="space-y-4">
              {state.profiles?.map((profile) => {
                const presentation = getReleaseProfilePresentation(profile);
                const selected = selectedProfileId === profile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`w-full rounded-[1.5rem] border p-5 text-left ${selected ? 'border-zinc-600 bg-zinc-900/90' : 'border-zinc-800/50 bg-zinc-950/50'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-bold text-zinc-100">{presentation.name}</h2>
                      {selected && <Check size={17} className="text-emerald-400" aria-hidden="true" />}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{presentation.description}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="mt-6 text-center">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-zinc-800/50 bg-zinc-900/80">
              <Lock size={40} className="text-zinc-100" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Lokal und transparent</h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Regeln, Schutzverlauf und Nutzungsstatistiken bleiben in Version 1 lokal. ScrollShield liest keine Chats, Passwörter oder Inhalte der geschützten Apps.
            </p>
            <div className="mt-6 rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5 text-left text-sm leading-relaxed text-zinc-400">
              <strong className="block text-zinc-200">{state.operatingSystem === 'android' ? 'Android v1' : 'iOS-Status'}</strong>
              {state.operatingSystem === 'android'
                ? 'Der reale Schutz nutzt Nutzungszugriff, ein sichtbares Overlay und eine dauerhaft sichtbare Schutzbenachrichtigung. Du siehst den Dienststatus vor und nach dem Start.'
                : 'Die produktionsreife iOS-Bildschirmzeit-Integration ist noch nicht freigegeben. Die App wird dort keine fertige Systemschutz-Funktion vortäuschen.'}
            </div>
          </section>
        )}
      </div>

      <div className="bg-zinc-950 pt-4">
        <div className="mb-6 flex justify-center gap-2" aria-label={`Schritt ${step} von 3`}>
          {[1, 2, 3].map((index) => (
            <div key={index} className={`h-1.5 rounded-full ${index === step ? 'w-8 bg-zinc-100' : 'w-2 bg-zinc-800'}`} />
          ))}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep((current) => current - 1) : navigate('welcome'))}
            className="w-16 rounded-[1.5rem] border border-zinc-800 bg-zinc-900 py-4 text-zinc-400"
            aria-label="Zurück"
          >
            ←
          </button>
          <button
            type="button"
            onClick={nextStep}
            disabled={!canContinue}
            className="flex-1 rounded-[1.5rem] bg-zinc-100 py-4 font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step === 1 && !canContinue
              ? 'Mindestens eine App wählen'
              : step < 3
                ? 'Weiter'
                : state.operatingSystem === 'android'
                  ? 'Android-Zugriffe prüfen'
                  : 'iOS-Status ansehen'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
