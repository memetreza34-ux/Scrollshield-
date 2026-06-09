import React from 'react';
import { motion } from 'motion/react';
import { LifeBuoy, MessageSquare, Bug, ShieldAlert, Trash2, FileText, ExternalLink, ChevronRight, Info } from 'lucide-react';
import { Screen } from '../types';
import { Header } from '../components/ui';

export function SupportScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const handleEmail = (subject: string) => {
    window.location.href = `mailto:support@scrollshield.app?subject=${encodeURIComponent(subject)}`;
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 pb-32 flex flex-col h-full bg-zinc-950">
      <Header title="Support & Kontakt" onBack={() => navigate('settings')} />
      
      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide">
        {/* FAQ */}
        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Hilfe</h2>
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-[1.5rem] overflow-hidden">
            <button onClick={() => navigate('help')} className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
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

        {/* Kontakt */}
        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Kontakt</h2>
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-[1.5rem] overflow-hidden flex flex-col">
            <button onClick={() => handleEmail('Feedback zu ScrollShield')} className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left border-b border-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <div className="flex items-center gap-3">
                <MessageSquare size={20} className="text-emerald-400" />
                <div>
                  <div className="font-semibold text-zinc-200 text-sm">Feedback senden</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Ideen oder Wünsche teilen</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-600" />
            </button>
            <button onClick={() => handleEmail('Problem melden: ScrollShield')} className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
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

        {/* Datenschutz */}
        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Datenschutz</h2>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-[1.5rem] p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert size={20} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-emerald-400 text-sm mb-1">100% Offline-First</h3>
                <p className="text-xs text-emerald-300/80 leading-relaxed">
                  Weil ScrollShield zu 100 % offline läuft, liegen all deine Daten extrem sicher ausschließlich auf diesem Gerät. Wir haben keinen Server und keinen Zugriff auf deine Historie oder Limits. Wenn du alle Daten löschen willst, nutze einfach den "App zurücksetzen" Button in den Einstellungen unter Datenschutz & Transparenz.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Rechtliches */}
        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Rechtliches</h2>
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-[1.5rem] overflow-hidden flex flex-col">
            <button onClick={() => navigate('imprint')} className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left border-b border-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-zinc-400" />
                <div className="font-semibold text-zinc-200 text-sm">Impressum</div>
              </div>
              <ChevronRight size={18} className="text-zinc-600" />
            </button>
            <button onClick={() => navigate('privacy')} className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-zinc-400" />
                <div className="font-semibold text-zinc-200 text-sm">Datenschutzerklärung</div>
              </div>
              <ChevronRight size={18} className="text-zinc-600" />
            </button>
          </div>
        </section>

        {/* Version Info */}
        <div className="pt-6 pb-12 flex flex-col items-center justify-center text-center opacity-60">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center mb-3 border border-zinc-800">
            <Info size={24} className="text-zinc-500" />
          </div>
          <div className="text-sm font-bold text-zinc-400">ScrollShield</div>
          <div className="text-xs text-zinc-500 font-mono mt-1">Version 1.0.0 (Build 20260415)</div>
          <div className="text-xs text-zinc-600 mt-2">© 2026 ScrollShield App</div>
        </div>
      </div>
    </motion.div>
  );
}

export function ImprintScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 pb-32 flex flex-col h-full bg-zinc-950">
      <Header title="Impressum" onBack={() => navigate('support')} />
      
      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide text-zinc-300 text-sm leading-relaxed">
        <section className="bg-zinc-900/80 border border-zinc-800/50 rounded-[2rem] p-6">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">Angaben gemäß § 5 TMG</h2>
          <p className="mb-2">
            <strong>ScrollShield GmbH</strong><br />
            Musterstraße 123<br />
            10115 Berlin<br />
            Deutschland
          </p>
          
          <h3 className="font-bold text-zinc-100 mt-6 mb-2">Vertreten durch:</h3>
          <p className="mb-2">Max Mustermann (Geschäftsführer)</p>

          <h3 className="font-bold text-zinc-100 mt-6 mb-2">Kontakt:</h3>
          <p className="mb-2">
            Telefon: +49 (0) 30 12345678<br />
            E-Mail: support@scrollshield.app
          </p>

          <h3 className="font-bold text-zinc-100 mt-6 mb-2">Registereintrag:</h3>
          <p className="mb-2">
            Eintragung im Handelsregister.<br />
            Registergericht: Amtsgericht Charlottenburg<br />
            Registernummer: HRB 123456 B
          </p>

          <h3 className="font-bold text-zinc-100 mt-6 mb-2">Umsatzsteuer-ID:</h3>
          <p className="mb-2">
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
            DE 123456789
          </p>

          <h3 className="font-bold text-zinc-100 mt-6 mb-2">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:</h3>
          <p className="mb-2">
            Max Mustermann<br />
            Musterstraße 123<br />
            10115 Berlin
          </p>

          <h3 className="font-bold text-zinc-100 mt-6 mb-2">Markenrechtlicher Hinweis:</h3>
          <p className="mb-2 text-xs text-zinc-400">
            Alle in dieser App genannten Produktnamen, Logos und Marken (z.B. Instagram, TikTok, YouTube, X, Snapchat, Facebook) sind Eigentum der jeweiligen Rechteinhaber. 
            ScrollShield steht in keiner Verbindung zu diesen Unternehmen und wird von diesen weder unterstützt noch gesponsert. Die Nennung dient ausschließlich der Beschreibung der blockierbaren Dienste.
          </p>
          
          <div className="mt-8 pt-6 border-t border-zinc-800/50 text-xs text-zinc-500">
            <p>Plattform der EU-Kommission zur Online-Streitbeilegung: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">https://ec.europa.eu/consumers/odr</a></p>
            <p className="mt-2">Wir sind zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle weder verpflichtet noch bereit.</p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
