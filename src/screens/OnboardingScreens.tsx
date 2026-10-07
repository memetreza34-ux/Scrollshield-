import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Shield } from 'lucide-react';
import { AppState, Screen, SUPPORTED_APPS } from '../types';
import { AppTile, PrimaryButton, SecondaryButton } from '../components/ui';
import { FREE_LIMITS } from '../lib/entitlements';
import { applyPreset } from '../lib/presets';
import { normalizeAppConfig } from '../lib/state';

/** Willkommen (docs/V1_MASTER_PLAN.md, 4.1). */
export function Welcome({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-full flex-col px-6 pb-8 pt-16"
    >
      <div className="flex flex-1 flex-col">
        <Shield size={44} className="mb-8 text-emerald-400" aria-hidden="true" />
        <h1 className="mb-3 text-4xl font-semibold tracking-tight text-zinc-50">ScrollShield</h1>
        <p className="mb-10 text-xl leading-snug text-zinc-300">
          Stoppe den Autopiloten, bevor aus einem Öffnen wieder Scrollen wird.
        </p>

        <ul className="space-y-5">
          {[
            ['Bewusst öffnen', 'Eine kurze Pause gibt dir eine echte Wahl: zurück oder bewusst weiter.'],
            ['Wiederöffnen erkennen', 'Wer kurz danach erneut zurückkehrt, bekommt mehr Reibung statt derselben Warnung.'],
            ['Kein Konto', 'Deine Schutzdaten bleiben auf deinem Handy.'],
          ].map(([title, text]) => (
            <li key={title}>
              <p className="font-medium text-zinc-100">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{text}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 space-y-3">
        <PrimaryButton onClick={() => navigate('onboarding')}>Loslegen</PrimaryButton>
        <SecondaryButton onClick={() => navigate('help')}>Mehr erfahren</SecondaryButton>
        <p className="text-center text-xs text-zinc-500">Für Nutzer ab 16 Jahren.</p>
      </div>
    </motion.div>
  );
}

/**
 * Onboarding: choose apps, see how it works, then permissions. No paywall:
 * the free limit shows as a sentence, not as a sales screen.
 */
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
  const limitReached = selectedApps.length >= FREE_LIMITS.protectedApps;

  const next = () => {
    if (step === 1) {
      const appsConfig = { ...state.appsConfig };
      selectedApps.forEach((id) => {
        appsConfig[id] = { ...applyPreset(normalizeAppConfig(id, appsConfig[id]), 'ausgewogen'), active: true };
      });
      updateState({ appsConfig });
    }
    if (step < 3) setStep(step + 1);
    else navigate('permissions');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full flex-col px-6 pb-8 pt-10"
    >
      <p className="mb-2 text-sm text-zinc-500">Schritt {step} von 3</p>
      <div className="flex-1 overflow-y-auto pb-4 scrollbar-hide">
        {step === 1 && (
          <>
            <h2 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-50">Welche Apps ziehen dich rein?</h2>
            <p className="mb-6 text-sm text-zinc-400">
              Kostenlos schützt ScrollShield {FREE_LIMITS.protectedApps} Apps. Mehr geht später mit Pro.
            </p>
            <div className="divide-y divide-zinc-800/80 overflow-hidden rounded-2xl bg-zinc-900">
              {SUPPORTED_APPS.map((app) => {
                const selected = selectedApps.includes(app.id);
                const disabled = !selected && limitReached;
                return (
                  <button
                    key={app.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() =>
                      setSelectedApps((previous) =>
                        selected ? previous.filter((id) => id !== app.id) : [...previous, app.id],
                      )
                    }
                    className={`flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left ${disabled ? 'opacity-40' : 'hover:bg-zinc-800/60'}`}
                  >
                    <AppTile app={app} size="sm" />
                    <span className="flex-1 font-medium text-zinc-100">{app.name}</span>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-700'}`}
                      aria-hidden="true"
                    >
                      {selected && <Check size={14} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-50">So funktioniert's</h2>
            <ol className="space-y-5">
              {[
                ['Du öffnest eine geschützte App', 'ScrollShield zeigt eine kurze Pause.'],
                ['Du entscheidest', '„Zurück“ oder nach der Pause „Weiter“.'],
                ['Du öffnest sie gleich wieder', 'ScrollShield erkennt den Reopen und kann die Pause schrittweise erhöhen.'],
                ['Du bleibst bewusst', 'Mit Fokus und später Session Guard begrenzt du nicht nur den Einstieg, sondern auch die Nutzung.'],
              ].map(([title, text], index) => (
                <li key={title} className="flex gap-4">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-200">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-medium text-zinc-100">{title}</span>
                    <span className="mt-1 block text-sm text-zinc-400">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-8 rounded-xl border border-zinc-800 px-4 py-3 text-sm text-zinc-400">
              Gestartet wird mit „Ausgewogen“. Du kannst das pro App im Tab „Schutz“ ändern.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-50">Deine Daten</h2>
            <ul className="space-y-5 text-sm leading-relaxed text-zinc-400">
              <li>
                <span className="block font-medium text-zinc-100">Kein Konto, kein Server</span>
                Regeln, Verlauf und Zahlen bleiben auf deinem Handy.
              </li>
              <li>
                <span className="block font-medium text-zinc-100">Keine Inhalte</span>
                ScrollShield sieht, welche App offen ist – nie, was du darin liest oder schreibst.
              </li>
              <li>
                <span className="block font-medium text-zinc-100">Gleich: Berechtigungen</span>
                Android fragt nach zwei Erlaubnissen. Ohne sie kann ScrollShield keine App unterbrechen.
              </li>
            </ul>
          </>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate('welcome'))}
          className="min-h-[52px] rounded-2xl bg-zinc-800 px-5 font-semibold text-zinc-200"
        >
          Zurück
        </button>
        <div className="flex-1">
          <PrimaryButton onClick={next} disabled={step === 1 && selectedApps.length === 0}>
            {step < 3 ? 'Weiter' : 'Berechtigungen'}
          </PrimaryButton>
        </div>
      </div>
    </motion.div>
  );
}
