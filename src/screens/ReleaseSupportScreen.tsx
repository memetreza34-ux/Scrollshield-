import { Bug, ChevronRight, FileText, LifeBuoy, MessageSquare, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { Header } from '../components/ui';
import { createPrivacyRequestMailto, createSupportMailto } from '../lib/contact';
import type { Screen } from '../types';

export function ReleaseSupportScreen({ navigate }: { navigate: (screen: Screen) => void }) {
  const openMailto = (href: string) => window.location.assign(href);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32"
    >
      <Header title="Support & Kontakt" onBack={() => navigate('settings')} />

      <div className="space-y-6">
        <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-emerald-300">Lokale Nutzungsdaten</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Die aktuelle Version besitzt keinen ScrollShield-Account und keinen Cloud-Sync für Regeln, Verlauf oder Nutzungsstatistiken. Diese Daten werden lokal verwaltet und können unter „Datenschutz & lokale Daten“ exportiert, einzeln gelöscht oder vollständig zurückgesetzt werden.
              </p>
              <button
                type="button"
                onClick={() => navigate('privacy')}
                className="mt-4 min-h-[44px] rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-bold text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Lokale Daten verwalten
              </button>
            </div>
          </div>
        </section>

        <section aria-labelledby="support-help-title">
          <h2 id="support-help-title" className="mb-3 px-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Hilfe</h2>
          <div className="overflow-hidden rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80">
            <button
              type="button"
              onClick={() => navigate('help')}
              className="flex min-h-[64px] w-full items-center gap-3 p-4 text-left hover:bg-zinc-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
            >
              <LifeBuoy size={20} className="text-blue-400" aria-hidden="true" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-zinc-200">Hilfe & Funktionsumfang</div>
                <p className="mt-0.5 text-xs text-zinc-500">Android-v1-Schutz, Notfallfreigabe und Plattformgrenzen.</p>
              </div>
              <ChevronRight size={18} className="text-zinc-600" aria-hidden="true" />
            </button>
          </div>
        </section>

        <section aria-labelledby="support-contact-title">
          <h2 id="support-contact-title" className="mb-3 px-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Kontakt</h2>
          <div className="overflow-hidden rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80">
            <button
              type="button"
              onClick={() => openMailto(createSupportMailto('Feedback zu ScrollShield'))}
              className="flex min-h-[64px] w-full items-center gap-3 border-b border-zinc-800/50 p-4 text-left hover:bg-zinc-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
            >
              <MessageSquare size={20} className="text-emerald-400" aria-hidden="true" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-zinc-200">Feedback senden</div>
                <p className="mt-0.5 text-xs text-zinc-500">Wünsche und Erfahrungen für die Produktentwicklung teilen.</p>
              </div>
              <ChevronRight size={18} className="text-zinc-600" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => openMailto(createSupportMailto('Problem melden: ScrollShield'))}
              className="flex min-h-[64px] w-full items-center gap-3 border-b border-zinc-800/50 p-4 text-left hover:bg-zinc-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
            >
              <Bug size={20} className="text-amber-400" aria-hidden="true" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-zinc-200">Problem melden</div>
                <p className="mt-0.5 text-xs text-zinc-500">Gerätemodell, Android-Version und beobachtetes Verhalten helfen bei der Diagnose.</p>
              </div>
              <ChevronRight size={18} className="text-zinc-600" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => openMailto(createPrivacyRequestMailto())}
              className="flex min-h-[64px] w-full items-center gap-3 p-4 text-left hover:bg-zinc-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
            >
              <FileText size={20} className="text-zinc-400" aria-hidden="true" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-zinc-200">Datenschutzfrage</div>
                <p className="mt-0.5 text-xs text-zinc-500">Fragen zur App, Berechtigungen oder Datenverarbeitung stellen.</p>
              </div>
              <ChevronRight size={18} className="text-zinc-600" aria-hidden="true" />
            </button>
          </div>
        </section>

        <section aria-labelledby="support-legal-title">
          <h2 id="support-legal-title" className="mb-3 px-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Rechtliches</h2>
          <div className="overflow-hidden rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80">
            <button
              type="button"
              onClick={() => navigate('privacy')}
              className="flex min-h-[60px] w-full items-center justify-between border-b border-zinc-800/50 p-4 text-left hover:bg-zinc-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
            >
              <span className="text-sm font-semibold text-zinc-200">Datenschutzerklärung</span>
              <ChevronRight size={18} className="text-zinc-600" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => navigate('imprint')}
              className="flex min-h-[60px] w-full items-center justify-between p-4 text-left hover:bg-zinc-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
            >
              <span className="text-sm font-semibold text-zinc-200">Impressum</span>
              <ChevronRight size={18} className="text-zinc-600" aria-hidden="true" />
            </button>
          </div>
        </section>

        <p className="text-center text-xs text-zinc-600">ScrollShield {__APP_VERSION__}</p>
      </div>
    </motion.div>
  );
}
