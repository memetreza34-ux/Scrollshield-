import { AlertTriangle, Clock, Lock, Shield, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Header } from '../components/ui';
import type { AppState, Screen } from '../types';

function HelpCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Shield;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/70 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400" aria-hidden="true">
          <Icon size={19} />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-zinc-100">{title}</h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-400">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function HelpScreen({ state, navigate }: { state: AppState; navigate: (screen: Screen) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32"
    >
      <Header title="Hilfe" onBack={() => navigate('settings')} />

      <div className="space-y-4">
        <HelpCard icon={Shield} title="Was ScrollShield v1 schützt">
          <p>
            Auf Android schützt ScrollShield die <strong className="text-zinc-200">gesamte ausgewählte App</strong>. Der
            Dienst erkennt, welche unterstützte App im Vordergrund ist, und kann dann die konfigurierte Öffnungspause,
            Limits, Zeitregeln oder strikte Sperre anwenden.
          </p>
          <p>
            Einzelne Reels-, Shorts-, Feed-Elemente oder Swipe-Bewegungen werden in Version 1 nicht separat erkannt und
            deshalb nicht als aktive Release-Funktion angeboten.
          </p>
        </HelpCard>

        <HelpCard icon={Clock} title="Bewusste Öffnung, Limits und Anti-Binge">
          <p>
            Eine normale Freigabe kann erst nach deiner Öffnungsverzögerung erfolgen. Danach gilt die eingestellte
            Session-Länge. Ein Tageslimit kann weitere normale Nutzung für den restlichen lokalen Tag strikt sperren.
          </p>
          <p>
            Anti-Binge zählt bewusste Öffnungen lokal. Bei häufigem Wiederöffnen kann ScrollShield zunächst warnen und
            später eine strikte Sperre auslösen.
          </p>
        </HelpCard>

        <HelpCard icon={AlertTriangle} title="Notfallfreigabe">
          <p>
            Die Notfallfreigabe ist ein begrenzter Ausnahmeweg für wirklich notwendige Situationen. Du bestimmst Dauer
            und maximale Freigaben pro Tag.
          </p>
          <p>
            Optional kann ScrollShield zusätzlich einen Countdown und eine kurze Begründung verlangen. Eine Begründung
            muss mindestens drei Zeichen haben, ist auf 160 Zeichen begrenzt und bleibt im lokalen Verlauf auf deinem
            Gerät. Die Rückkehr zum Startbildschirm bleibt immer möglich.
          </p>
        </HelpCard>

        <HelpCard icon={Lock} title="Android-Berechtigungen und Dienststatus">
          <p>
            Für den nativen Android-Schutz braucht ScrollShield Nutzungszugriff, die Overlay-Freigabe und sichtbare
            Benachrichtigungen. Die Dauerbenachrichtigung zeigt, dass der Schutzdienst läuft, und enthält eine direkte
            Stop-Aktion.
          </p>
          <p>
            Wenn Android eine Berechtigung entzieht oder den Dienst beendet, speichert ScrollShield einen lokalen
            Diagnosegrund. Unter „Schutzstatus & Berechtigungen“ siehst du den tatsächlichen Dienstzustand statt einer
            bloßen Ein/Aus-Anzeige.
          </p>
        </HelpCard>

        <HelpCard icon={Smartphone} title="Android und iOS">
          {state.operatingSystem === 'android' ? (
            <p>
              Der aktuelle Release-Kandidat ist auf den nativen Android-Schutz ausgerichtet. Die dokumentierten
              Android-Funktionen müssen vor Veröffentlichung noch den vollständigen Build- und Geräte-Testplan bestehen.
            </p>
          ) : (
            <p>
              Die iOS-Oberfläche ist derzeit nur Produktvorschau. Native Family Controls / Screen-Time-Durchsetzung ist
              noch nicht Teil des freigabefähigen Kandidaten und wird nicht als funktionierende Schutzengine behauptet.
            </p>
          )}
        </HelpCard>

        <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h2 className="font-semibold text-emerald-300">Datenschutz und Datenrettung</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Regeln, Schutzereignisse, Statistiken und Notfallbegründungen bleiben lokal. Alte V0.7-Daten werden vor einer
            erfolgreichen Migration bytegenau archiviert. Export, Import und Recovery stehen unter „Datenschutz & lokale
            Daten“ zur Verfügung.
          </p>
          <button
            type="button"
            onClick={() => navigate('privacy')}
            className="mt-4 min-h-[44px] rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-bold text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Datenschutz & lokale Daten öffnen
          </button>
        </section>
      </div>
    </motion.div>
  );
}
