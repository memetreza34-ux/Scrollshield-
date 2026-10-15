import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import {
  Database,
  FileText,
  Globe,
  Cloud,
  ChevronDown,
  ChevronUp,
  Star,
  ChevronRight,
  Shield,
  Smartphone,
  Lock,
  AlertTriangle,
  RefreshCw,
  Play,
  Info,
  Download,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { AppState, Screen } from '../types';
import { Header } from '../components/ui';
import {
  createExportFilename,
  createScrollShieldExport,
  MAX_IMPORT_BYTES,
  parseScrollShieldExport,
  serializeScrollShieldExport,
} from '../lib/dataExport';
import { normalizeAppState } from '../lib/state';
import { saveTextFileNatively } from '../lib/nativeBridge';

export function Help({ navigate }: { navigate: (s: Screen) => void }) {
  const [openSection, setOpenSection] = useState<string | null>('start');

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  const AccordionItem = ({
    id,
    icon: Icon,
    title,
    children,
  }: {
    id: string;
    icon: LucideIcon;
    title: string;
    children: React.ReactNode;
  }) => {
    const isOpen = openSection === id;
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-[1.5rem] overflow-hidden transition-colors hover:bg-zinc-900/80">
        <button
          onClick={() => toggleSection(id)}
          className="w-full p-5 flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
          aria-expanded={isOpen}
          aria-controls={`sect-${id}`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}
              aria-hidden="true"
            >
              <Icon size={18} />
            </div>
            <span className="font-semibold text-zinc-200">{title}</span>
          </div>
          {isOpen ? (
            <ChevronUp size={18} className="text-zinc-500" aria-hidden="true" />
          ) : (
            <ChevronDown size={18} className="text-zinc-500" aria-hidden="true" />
          )}
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id={`sect-${id}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 pt-0 text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/50 mt-2">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32 flex flex-col h-full bg-zinc-950"
    >
      <Header title="Hilfe & FAQ" onBack={() => navigate('support')} />

      <div className="space-y-3 flex-1 overflow-y-auto scrollbar-hide mt-2">
        <AccordionItem id="start" icon={Star} title="Tipps für einen guten Start">
          <p className="mb-3">
            Willkommen bei ScrollShield. Das Ziel ist nicht, dein Handy unbrauchbar zu machen, sondern dir die Kontrolle
            zurückzugeben.
          </p>
          <ul className="list-disc pl-4 space-y-2">
            <li>
              <strong>Weniger ist mehr:</strong> Wähle anfangs nur 1-2 Apps aus, die dir wirklich Zeit rauben (z.B.
              Instagram oder TikTok).
            </li>
            <li>
              <strong>Sanft starten:</strong> Nutze das Profil "Sanfter Start". Eine kurze Verzögerung von 5 Sekunden
              reicht oft schon, um einen unbewussten Impuls zu brechen.
            </li>
            <li>
              <strong>Nicht frustrieren lassen:</strong> Wenn du eine App wirklich brauchst, nutze die Notfallfreigabe.
              Bewusst nutzen ist besser als ganz verzichten.
            </li>
          </ul>
        </AccordionItem>

        <AccordionItem id="modes" icon={Shield} title="Schutzprofile & Verzögerung">
          <p className="mb-3">
            ScrollShield arbeitet mit vorgefertigten Profilen, die bestimmen, wie streng Apps blockiert werden.
          </p>
          <ul className="list-disc pl-4 space-y-2">
            <li>
              <strong>Die Öffnungsverzögerung:</strong> Das Herzstück der App. Bevor sich eine geschützte App öffnet,
              läuft ein kurzer Timer ab. Das stoppt den "Autopiloten" in deinem Gehirn.
            </li>
            <li>
              <strong>Tageslimits:</strong> Jedes Profil hat ein Limit (z.B. 30 Minuten). Ist dieses erreicht, wird die
              App für den Rest des Tages blockiert.
            </li>
            <li>
              <strong>Profilwechsel:</strong> Du kannst jederzeit zwischen Profilen (z.B. "Arbeit" oder "Schlaf")
              wechseln, um die Strenge an deinen Alltag anzupassen.
            </li>
          </ul>
        </AccordionItem>

        <AccordionItem id="focus" icon={Play} title="Fokus-Sitzungen">
          <p>Der Fokus-Modus ist für Phasen tiefer Konzentration (Deep Work) gedacht.</p>
          <p className="mt-2">
            Wenn du eine Fokus-Sitzung startest (z.B. für 45 Minuten), wendet ScrollShield auf alle ausgewählten Apps
            die strengste verfügbare Einschränkung an. Eine Notfallfreigabe bleibt nach einer längeren Wartezeit
            möglich. Nutze diesen Modus zum Lernen oder Arbeiten.
          </p>
        </AccordionItem>

        <AccordionItem id="emergency" icon={AlertTriangle} title="Die Notfallfreigabe">
          <p>
            Manchmal muss man einfach kurz eine Nachricht checken oder etwas nachsehen. Dafür gibt es die
            Notfallfreigabe.
          </p>
          <p className="mt-2">
            Wenn eine App blockiert ist, kannst du sie für wenige Minuten (meist 5 Min.) freischalten. Dies erfordert
            jedoch eine bewusste Bestätigung. In sehr strengen Profilen (wie "Schlaf schützen") ist diese Funktion
            deaktiviert.
          </p>
        </AccordionItem>

        <AccordionItem id="permissions" icon={Lock} title="Berechtigungen & Privatsphäre">
          <p className="mb-3">Um dich zu schützen, muss ScrollShield wissen, wann du eine App öffnest.</p>
          <ul className="list-disc pl-4 space-y-2">
            <li>
              <strong>Warum diese Rechte?</strong> Wir nutzen System-APIs (wie Screen Time oder Nutzungsdaten), um den
              Start einer App zu erkennen und das Blockier-Fenster darüberzulegen.
            </li>
            <li>
              <strong>Deine Daten:</strong> Diese Berechtigungen werden <em>ausschließlich</em> für die Blockier-Logik
              verwendet. Wir lesen keine Chats, sehen keine Passwörter und senden keine Nutzungsdaten an unsere Server.
              Alles bleibt lokal auf deinem Gerät.
            </li>
          </ul>
        </AccordionItem>

        <AccordionItem id="platform" icon={Smartphone} title="iOS vs. Android">
          <p>ScrollShield funktioniert auf beiden Plattformen, nutzt aber unterschiedliche Techniken.</p>
          <p className="mt-2">
            <strong>Apple (iOS):</strong> Nutzt die offizielle Screen Time API. Das ist sehr sicher und akkuschonend,
            erlaubt aber keine direkten "Overlays" über anderen Apps. Wir nutzen stattdessen System-Schilder.
          </p>
          <p className="mt-2">
            <strong>Android:</strong> Nutzt Nutzungsdatenzugriff, um die Vordergrund-App zu erkennen, und optional
            Overlay-Rechte für eigene Schutzbildschirme. Zusätzliche Bedienhilfen-Schnittstellen sind für die
            Release-Version nicht vorgesehen.
          </p>
        </AccordionItem>
      </div>
    </motion.div>
  );
}

export function PrivacyScreen({
  state,
  updateState,
  resetApp,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  resetApp: () => void;
  navigate: (s: Screen) => void;
}) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHistoryConfirm, setShowHistoryConfirm] = useState(false);
  const [showStatsConfirm, setShowStatsConfirm] = useState(false);
  const [showDetailedPolicy, setShowDetailedPolicy] = useState(false);
  const [dataStatus, setDataStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const clearHistory = () => {
    updateState({ history: [] });
    setShowHistoryConfirm(false);
  };

  const clearStats = () => {
    updateState({
      dailyStats: {},
      stats: { currentStreak: 0, bestStreak: 0, totalSavedTime: 0, focusStreak: 0, cleanDaysStreak: 0 },
    });
    setShowStatsConfirm(false);
  };

  const exportLocalData = async () => {
    const content = serializeScrollShieldExport(createScrollShieldExport(state, { appVersion: __APP_VERSION__ }));
    const filename = createExportFilename();

    // The Android WebView ignores <a download>; the export silently did nothing
    // in the app. There Android's own "save as" dialog writes the file.
    if (Capacitor.isNativePlatform()) {
      try {
        const saved = await saveTextFileNatively({ filename, content, mimeType: 'application/json' });
        if (saved) setDataStatus({ type: 'success', message: `Gespeichert als ${filename}.` });
      } catch {
        setDataStatus({ type: 'error', message: 'Die Datei konnte nicht gespeichert werden.' });
      }
      return;
    }

    const objectUrl = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.click();
    // Revoked right after the click, some browsers cancel the download.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  };

  const importLocalData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > MAX_IMPORT_BYTES) {
      setDataStatus({ type: 'error', message: 'Die Importdatei ist größer als 5 MB.' });
      return;
    }

    try {
      const imported = parseScrollShieldExport(await file.text());
      const normalized = normalizeAppState({
        ...state,
        ...imported.state,
        operatingSystem: state.operatingSystem,
        permissions: state.permissions,
        activeSession: null,
        simulatedAppToOpen: null,
      });

      updateState(normalized);
      setDataStatus({ type: 'success', message: 'Lokale Daten wurden erfolgreich importiert.' });
    } catch (error) {
      setDataStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Die Importdatei konnte nicht gelesen werden.',
      });
    }
  };

  if (showDetailedPolicy) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="p-6 pb-32 flex flex-col h-full bg-zinc-950 absolute inset-0 z-50"
      >
        <Header title="Datenschutzerklärung" onBack={() => setShowDetailedPolicy(false)} />
        <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide text-zinc-300 leading-relaxed mt-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Präambel</h3>
            <p className="text-sm text-zinc-400">
              Wir haben ScrollShield entwickelt, um dir die Kontrolle über deine Zeit zurückzugeben – nicht, um deine
              Daten zu sammeln. Diese Erklärung zeigt in einfachen Worten, was mit deinen Daten passiert. Die
              Kurzfassung: Was auf deinem Gerät passiert, bleibt auf deinem Gerät.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">1. Lokale Daten</h3>
            <p className="text-sm text-zinc-400">
              ScrollShield speichert, wie oft du Apps öffnest, wie oft du blockiert wurdest und wie viel Zeit du gespart
              hast. Diese Daten werden <strong>ausschließlich lokal</strong> in der sicheren Sandbox deines Smartphones
              gespeichert.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">2. Keine Server-Übertragung</h3>
            <p className="text-sm text-zinc-400">
              Wir übertragen aktuell keinerlei Nutzungsdaten, App-Historien oder Statistiken an unsere Server. Wir haben
              keinen Zugriff auf dein Verhalten.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">3. Systemberechtigungen</h3>
            <p className="text-sm text-zinc-400 mb-2">
              Um zu funktionieren, benötigt ScrollShield bestimmte Systemrechte. Wir nutzen diese streng zweckgebunden:
            </p>
            <ul className="list-disc pl-4 text-sm text-zinc-400 space-y-1">
              <li>
                <strong>App-Nutzungsdaten / Screen Time:</strong> Wird ausschließlich genutzt, um den Start einer von
                dir ausgewählten App zu erkennen und den Timer auszulösen.
              </li>
              <li>
                <strong>Bildschirm-Überlagerung:</strong> Wird genutzt, um den Verzögerungs-Timer über der ablenkenden
                App anzuzeigen.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">4. Kein Tracking & Keine Werbung</h3>
            <p className="text-sm text-zinc-400">
              ScrollShield nutzt keine Tracking-Tools von Drittanbietern, um dein Verhalten über andere Apps hinweg für
              Werbezwecke zu verfolgen. Es gibt keine Werbung und keine Datenweitergabe an Datenbroker oder
              Werbenetzwerke.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">5. Datenlöschung</h3>
            <p className="text-sm text-zinc-400">
              Da deine Daten lokal gespeichert sind, hast du die volle Kontrolle. Ein Klick auf "App komplett
              zurücksetzen" oder die Deinstallation der App löscht alle Daten unwiderruflich von deinem Gerät.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32 flex flex-col h-full bg-zinc-950"
    >
      <Header title="Datenschutz & Transparenz" onBack={() => navigate('settings')} />

      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide">
        {/* Intro */}
        <div className="text-center py-4">
          <div
            className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20"
            aria-hidden="true"
          >
            <Shield size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Deine Daten gehören dir.</h2>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-[280px] mx-auto">
            ScrollShield arbeitet mit sensiblen Nutzungsdaten. Wir glauben an absolute Transparenz und lokale Kontrolle.
          </p>
        </div>

        {/* 1. Datenübersicht */}
        <section aria-labelledby="privacy-data-overview">
          <h2
            id="privacy-data-overview"
            className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2"
          >
            Was wir speichern
          </h2>
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-[2rem] p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Database size={18} className="text-blue-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-zinc-200 text-sm mb-1">Lokal auf deinem Gerät</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Dein Nutzungsverlauf, deine Statistiken und deine App-Regeln werden ausschließlich auf diesem Gerät
                  gespeichert.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Cloud size={18} className="text-zinc-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-zinc-200 text-sm mb-1">Was nicht gesendet wird</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Wir senden keine Nutzungsdaten an externe Server. Dein Verhalten bleibt strikt privat auf deinem
                  Gerät.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Berechtigungen */}
        <section aria-labelledby="privacy-permissions">
          <h2 id="privacy-permissions" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">
            Warum Berechtigungen?
          </h2>
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-[2rem] p-5 space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Um dich vor impulsivem Öffnen zu schützen, muss ScrollShield erkennen können, wann du eine bestimmte App
              startest. Dafür benötigen wir Systemberechtigungen (wie Screen Time oder Nutzungsdatenzugriff). Diese
              Rechte werden <strong className="text-zinc-300">ausschließlich</strong> für die Blockier-Logik verwendet,
              nicht um dich auszuspionieren.
            </p>
          </div>
        </section>

        {/* 2.5 Ausführliche Erklärung */}
        <section aria-label="Ausführliche Datenschutzerklärung">
          <button
            onClick={() => setShowDetailedPolicy(true)}
            className="w-full bg-zinc-900/80 border border-zinc-800/50 rounded-[1.5rem] p-5 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
          >
            <div className="flex items-center gap-3">
              <Info size={18} className="text-zinc-400" aria-hidden="true" />
              <span className="font-semibold text-zinc-200 text-sm">Ausführliche Datenschutzerklärung</span>
            </div>
            <ChevronRight size={18} className="text-zinc-500" aria-hidden="true" />
          </button>
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full bg-zinc-900/60 border border-zinc-800/50 rounded-[1.5rem] p-5 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
          >
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-zinc-400" aria-hidden="true" />
              <span className="font-semibold text-zinc-200 text-sm">Öffentliche Datenschutzseite</span>
            </div>
            <ChevronRight size={18} className="text-zinc-500" aria-hidden="true" />
          </a>
          <a
            href="/third-party-licenses.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full bg-zinc-900/60 border border-zinc-800/50 rounded-[1.5rem] p-5 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-zinc-400" aria-hidden="true" />
              <span className="font-semibold text-zinc-200 text-sm">Open-Source-Lizenzen</span>
            </div>
            <ChevronRight size={18} className="text-zinc-500" aria-hidden="true" />
          </a>
        </section>

        {/* 3. Kontrolle & Löschen */}
        <section aria-labelledby="privacy-data-management">
          <h2
            id="privacy-data-management"
            className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2"
          >
            Lokale Daten verwalten
          </h2>
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-[2rem] overflow-hidden">
            <button
              onClick={() => void exportLocalData()}
              className="w-full p-5 flex items-center justify-between border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
            >
              <div>
                <div className="font-semibold text-zinc-200 text-sm">Lokale Daten exportieren</div>
                <div className="text-xs text-zinc-500 mt-1">Speichert Regeln, Verlauf und Statistiken als JSON.</div>
              </div>
              <Download size={18} className="text-zinc-500" aria-hidden="true" />
            </button>

            <label className="w-full p-5 flex items-center justify-between border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors text-left cursor-pointer focus-within:ring-2 focus-within:ring-emerald-500 min-h-[48px]">
              <div>
                <div className="font-semibold text-zinc-200 text-sm">Lokale Daten importieren</div>
                <div className="text-xs text-zinc-500 mt-1">
                  Stellt Regeln, Verlauf und Statistiken aus JSON wieder her.
                </div>
              </div>
              <Upload size={18} className="text-zinc-500" aria-hidden="true" />
              <input
                type="file"
                accept="application/json,.json"
                onChange={importLocalData}
                className="sr-only"
                aria-label="ScrollShield JSON-Export importieren"
              />
            </label>

            {dataStatus && (
              <div
                role={dataStatus.type === 'error' ? 'alert' : 'status'}
                className={`px-5 py-3 text-xs border-b ${
                  dataStatus.type === 'error'
                    ? 'text-red-300 bg-red-500/10 border-red-500/20'
                    : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                }`}
              >
                {dataStatus.message}
              </div>
            )}

            {/* Verlauf löschen */}
            {showHistoryConfirm ? (
              <div className="p-5 bg-amber-500/10 border-b border-amber-500/20" role="alert">
                <p className="text-sm text-amber-400 mb-3 font-medium text-center">Nutzungsverlauf wirklich löschen?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHistoryConfirm(false)}
                    className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-h-[44px]"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={clearHistory}
                    className="flex-1 py-2 bg-amber-500 text-amber-950 rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-h-[44px]"
                  >
                    Ja, leeren
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowHistoryConfirm(true)}
                className="w-full p-5 flex items-center justify-between border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
              >
                <div>
                  <div className="font-semibold text-zinc-200 text-sm">Verlauf leeren</div>
                  <div className="text-xs text-zinc-500 mt-1">Löscht die Historie der blockierten Apps.</div>
                </div>
                <RefreshCw size={18} className="text-zinc-500" aria-hidden="true" />
              </button>
            )}

            {/* Statistiken zurücksetzen */}
            {showStatsConfirm ? (
              <div className="p-5 bg-amber-500/10 border-b border-amber-500/20" role="alert">
                <p className="text-sm text-amber-400 mb-3 font-medium text-center">
                  Alle Statistiken & Streaks auf 0 setzen?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowStatsConfirm(false)}
                    className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-h-[44px]"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={clearStats}
                    className="flex-1 py-2 bg-amber-500 text-amber-950 rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-h-[44px]"
                  >
                    Ja, zurücksetzen
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowStatsConfirm(true)}
                className="w-full p-5 flex items-center justify-between border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
              >
                <div>
                  <div className="font-semibold text-zinc-200 text-sm">Statistiken zurücksetzen</div>
                  <div className="text-xs text-zinc-500 mt-1">Setzt Streaks und gesparte Zeit auf null.</div>
                </div>
                <RefreshCw size={18} className="text-zinc-500" aria-hidden="true" />
              </button>
            )}

            {/* App zurücksetzen */}
            {showResetConfirm ? (
              <div className="p-5 bg-red-500/10" role="alert">
                <p className="text-sm text-red-400 mb-3 font-medium text-center">
                  App auf Werkseinstellungen zurücksetzen?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 min-h-[44px]"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => {
                      resetApp();
                      setShowResetConfirm(false);
                    }}
                    className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 min-h-[44px]"
                  >
                    Ja, Reset
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full p-5 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 min-h-[48px]"
              >
                <div>
                  <div className="font-semibold text-red-400 text-sm">App zurücksetzen</div>
                  <div className="text-xs text-zinc-500 mt-1">Löscht alle Regeln, Profile und lokale Daten.</div>
                </div>
                <AlertTriangle size={18} className="text-red-400" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
