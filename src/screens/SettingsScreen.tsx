import {
  ChevronRight,
  CircleHelp,
  FileLock2,
  History,
  Info,
  LifeBuoy,
  ListChecks,
  Shield,
  Smartphone,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Header } from '../components/ui';
import type { AppState, Screen } from '../types';

function MenuRow({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[68px] w-full items-center gap-4 border-b border-zinc-800/50 p-4 text-left transition-colors last:border-b-0 hover:bg-zinc-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400"
        aria-hidden="true"
      >
        <Icon size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-zinc-100">{title}</div>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>
      </div>
      <ChevronRight size={18} className="flex-shrink-0 text-zinc-600" aria-hidden="true" />
    </button>
  );
}

export function SettingsScreen({ state, navigate }: { state: AppState; navigate: (screen: Screen) => void }) {
  const android = state.operatingSystem === 'android';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
      <Header title="Menü" />

      <div className="space-y-6">
        <section aria-labelledby="settings-protection-title">
          <h2
            id="settings-protection-title"
            className="mb-3 px-2 text-xs font-bold uppercase tracking-widest text-zinc-500"
          >
            Schutz
          </h2>
          <div className="overflow-hidden rounded-[2rem] border border-zinc-800/50 bg-zinc-900/80">
            <MenuRow
              icon={Shield}
              title="Schutzstatus & Berechtigungen"
              description={
                android
                  ? 'Echten Android-Dienststatus, Nutzungszugriff, Overlay und Benachrichtigungen prüfen.'
                  : 'iOS ist im aktuellen Release-Kandidaten noch Produktvorschau; native Durchsetzung ist nicht freigegeben.'
              }
              onClick={() => navigate('permissions')}
            />
            <MenuRow
              icon={Smartphone}
              title="Geschützte Apps"
              description="Apps auswählen und nur Regeln konfigurieren, die der aktuelle Schutzdienst tatsächlich auswertet."
              onClick={() => navigate('apps')}
            />
            <MenuRow
              icon={ListChecks}
              title="Profile & Regeln"
              description="Schutzprofile wechseln oder eigene Profile für deinen Alltag anlegen."
              onClick={() => navigate('rules')}
            />
            <MenuRow
              icon={History}
              title="Statistiken & Verlauf"
              description="Lokale Schutzereignisse, Notfallfreigaben und gemessene Freigabezeit ansehen."
              onClick={() => navigate('history')}
            />
          </div>
        </section>

        <section aria-labelledby="settings-data-title">
          <h2 id="settings-data-title" className="mb-3 px-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
            Daten & Hilfe
          </h2>
          <div className="overflow-hidden rounded-[2rem] border border-zinc-800/50 bg-zinc-900/80">
            <MenuRow
              icon={FileLock2}
              title="Datenschutz & lokale Daten"
              description="Export, Import, Verlauf/Statistiken löschen und vollständigen lokalen Reset verwalten."
              onClick={() => navigate('privacy')}
            />
            <MenuRow
              icon={CircleHelp}
              title="Hilfe"
              description="Funktionsumfang, Notfallfreigabe, Android-Berechtigungen und Plattformgrenzen verstehen."
              onClick={() => navigate('help')}
            />
            <MenuRow
              icon={LifeBuoy}
              title="Support & Kontakt"
              description="Feedback senden, Fehler melden und rechtliche Informationen öffnen."
              onClick={() => navigate('support')}
            />
          </div>
        </section>

        <section aria-labelledby="settings-version-title">
          <h2
            id="settings-version-title"
            className="mb-3 px-2 text-xs font-bold uppercase tracking-widest text-zinc-500"
          >
            App
          </h2>
          <div className="rounded-[2rem] border border-zinc-800/50 bg-zinc-900/80 p-5">
            <div className="flex items-start gap-3">
              <Info size={18} className="mt-0.5 flex-shrink-0 text-zinc-500" aria-hidden="true" />
              <div>
                <div className="text-sm font-semibold text-zinc-100">ScrollShield {__APP_VERSION__}</div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {android
                    ? 'Android ist die native Zielplattform dieses Release-Kandidaten.'
                    : 'Diese iOS-Ansicht ist noch Vorschau. Native Family Controls / Screen-Time-Durchsetzung ist nicht Bestandteil dieses Release-Kandidaten.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <p className="px-2 text-xs leading-relaxed text-zinc-600">
          Noch nicht technisch freigegebene Reminder-, Cloud-, Reels-/Shorts- oder Abo-Funktionen werden hier bewusst
          nicht als aktive Einstellungen angeboten.
        </p>
      </div>
    </motion.div>
  );
}
