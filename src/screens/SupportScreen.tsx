import { motion } from 'motion/react';
import { LifeBuoy, MessageSquare, Bug, ShieldAlert, FileText, ChevronRight, Info, Trash2 } from 'lucide-react';
import { Screen } from '../types';
import { Header } from '../components/ui';
import { createDeletionRequestMailto, createPrivacyRequestMailto, createSupportMailto } from '../lib/contact';

export function SupportScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const handleEmail = (subject: string) => {
    window.location.assign(createSupportMailto(subject));
  };

  const openMailto = (href: string) => {
    window.location.assign(href);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32 flex flex-col h-full bg-zinc-950"
    >
      <Header title="Support & Kontakt" onBack={() => navigate('settings')} />

      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide">
        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Hilfe</h2>
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-[1.5rem] overflow-hidden">
            <button
              onClick={() => navigate('help')}
              className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex items-center gap-3">
                <LifeBuoy size={20} className="text-blue-400" />
                <div>
                  <div className="font-semibold text-zinc-200 text-sm">FAQ & Hilfe-Center</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Antworten auf häufige Fragen</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-600" />
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Kontakt</h2>
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-[1.5rem] overflow-hidden flex flex-col">
            <button
              onClick={() => handleEmail('Feedback zu ScrollShield')}
              className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left border-b border-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={20} className="text-emerald-400" />
                <div>
                  <div className="font-semibold text-zinc-200 text-sm">Feedback senden</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Ideen oder Wünsche teilen</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-600" />
            </button>
            <button
              onClick={() => handleEmail('Problem melden: ScrollShield')}
              className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex items-center gap-3">
                <Bug size={20} className="text-amber-400" />
                <div>
                  <div className="font-semibold text-zinc-200 text-sm">Problem melden</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Fehler oder Abstürze melden</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-600" />
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Datenschutz</h2>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-[1.5rem] overflow-hidden">
            <div className="flex items-start gap-3 p-5 border-b border-emerald-500/20">
              <ShieldAlert size={20} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-emerald-400 text-sm mb-1">Offline-First</h3>
                <p className="text-xs text-emerald-300/80 leading-relaxed">
                  ScrollShield speichert Regeln, Verlauf und Statistiken lokal auf diesem Gerät. In der aktuellen
                  Version gibt es keinen Cloud-Sync und keine Serverübertragung deiner Nutzungsdaten.
                </p>
              </div>
            </div>
            <button
              onClick={() => openMailto(createPrivacyRequestMailto())}
              className="w-full p-4 flex items-center justify-between hover:bg-emerald-500/10 transition-colors text-left border-b border-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-emerald-400" />
                <div>
                  <div className="font-semibold text-zinc-200 text-sm">Datenschutzanfrage senden</div>
                  <div className="text-xs text-emerald-300/70 mt-0.5">Fragen zur Datenverarbeitung stellen</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-emerald-500/70" />
            </button>
            <button
              onClick={() => openMailto(createDeletionRequestMailto())}
              className="w-full p-4 flex items-center justify-between hover:bg-emerald-500/10 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={20} className="text-emerald-400" />
                <div>
                  <div className="font-semibold text-zinc-200 text-sm">Datenlöschanfrage senden</div>
                  <div className="text-xs text-emerald-300/70 mt-0.5">
                    Serverseitige Daten prüfen und löschen lassen
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-emerald-500/70" />
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Rechtliches</h2>
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-[1.5rem] overflow-hidden flex flex-col">
            <button
              onClick={() => navigate('imprint')}
              className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left border-b border-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-zinc-400" />
                <div className="font-semibold text-zinc-200 text-sm">Impressum</div>
              </div>
              <ChevronRight size={18} className="text-zinc-600" />
            </button>
            <button
              onClick={() => navigate('privacy')}
              className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-zinc-400" />
                <div className="font-semibold text-zinc-200 text-sm">Datenschutzerklärung</div>
              </div>
              <ChevronRight size={18} className="text-zinc-600" />
            </button>
          </div>
        </section>

        <div className="pt-6 pb-12 flex flex-col items-center justify-center text-center opacity-60">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center mb-3 border border-zinc-800">
            <Info size={24} className="text-zinc-500" />
          </div>
          <div className="text-sm font-bold text-zinc-400">ScrollShield</div>
          <div className="text-xs text-zinc-500 font-mono mt-1">Version {__APP_VERSION__}</div>
          <div className="text-xs text-zinc-600 mt-2">2026 ScrollShield</div>
        </div>
      </div>
    </motion.div>
  );
}

export function ImprintScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32 flex flex-col h-full bg-zinc-950"
    >
      <Header title="Impressum" onBack={() => navigate('support')} />

      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide text-zinc-300 text-sm leading-relaxed">
        <section className="bg-amber-500/10 border border-amber-500/30 rounded-[2rem] p-6">
          <h2 className="text-lg font-bold text-amber-300 mb-3">Angaben vor Release ergänzen</h2>
          <p className="text-amber-200/80">
            Für eine Veröffentlichung müssen hier die echten Anbieterangaben, Kontaktwege und rechtlich erforderlichen
            Registrierungsdaten hinterlegt werden.
          </p>
        </section>

        <section className="bg-zinc-900/80 border border-zinc-800/50 rounded-[2rem] p-6">
          <h3 className="font-bold text-zinc-100 mb-2">Kontakt</h3>
          <p className="mb-6">E-Mail: support@scrollshield.app</p>

          <h3 className="font-bold text-zinc-100 mb-2">Markenrechtlicher Hinweis</h3>
          <p className="mb-6 text-xs text-zinc-400">
            Alle genannten Produktnamen, Logos und Marken wie Instagram, TikTok, YouTube, X, Snapchat und Facebook sind
            Eigentum der jeweiligen Rechteinhaber. ScrollShield steht in keiner Verbindung zu diesen Unternehmen.
          </p>
        </section>
      </div>
    </motion.div>
  );
}
