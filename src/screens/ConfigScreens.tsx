import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Lock,
  Play,
  Shield,
  Smartphone,
  Star,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AppState, Screen } from '../types';
import { Header, List, Page, Row, Section, Sheet, TextButton } from '../components/ui';
import { FOCUS_RING, FOCUS_RING_INSET, PRESSED } from '../components/styles';
import { t } from '../i18n';
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

const DANGER_BUTTON = `flex min-h-12 w-full items-center justify-center rounded-control border border-lock px-4 py-3.5 text-label text-lock ${PRESSED} ${FOCUS_RING}`;

/**
 * Datenschutz & Daten (docs/V1_MASTER_PLAN.md, 4.9): what is stored – only on
 * the phone – and what never is, export (JSON) and deleting everything.
 */
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dataStatus, setDataStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const exportLocalData = async () => {
    const content = serializeScrollShieldExport(createScrollShieldExport(state, { appVersion: __APP_VERSION__ }));
    const filename = createExportFilename();

    // The Android WebView ignores <a download>; the export silently did nothing
    // in the app. There Android's own "save as" dialog writes the file.
    if (Capacitor.isNativePlatform()) {
      try {
        const saved = await saveTextFileNatively({ filename, content, mimeType: 'application/json' });
        if (saved) setDataStatus({ type: 'success', message: t('privacy.saved', { file: filename }) });
      } catch {
        setDataStatus({ type: 'error', message: t('privacy.saveFailed') });
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

    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('too large');
      const imported = parseScrollShieldExport(await file.text());
      updateState(
        normalizeAppState({
          ...state,
          ...imported.state,
          operatingSystem: state.operatingSystem,
          permissions: state.permissions,
          activeSession: null,
          simulatedAppToOpen: null,
        }),
      );
      setDataStatus({ type: 'success', message: t('privacy.imported') });
    } catch {
      setDataStatus({ type: 'error', message: t('privacy.importFailed') });
    }
  };

  const item = (Icon: LucideIcon, text: string) => (
    <li className="flex items-start gap-3 text-body text-ink">
      <Icon size={20} strokeWidth={2} className="mt-0.5 flex-shrink-0 text-muted" aria-hidden="true" />
      {text}
    </li>
  );

  return (
    <Page>
      <Header title={t('privacy.title')} onBack={() => navigate('settings')} />

      <div className="mb-6 flex items-center gap-3 rounded-surface border border-line bg-surface p-4">
        <Smartphone size={24} strokeWidth={1.75} className="flex-shrink-0 text-ink" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-title-s text-ink">{t('privacy.local')}</p>
          <p className="mt-0.5 text-body-s text-muted">{t('privacy.localText')}</p>
        </div>
      </div>

      <Section title={t('privacy.stored')} kind="title">
        <ul className="flex flex-col gap-2">
          {item(Check, t('privacy.stored.rules'))}
          {item(Check, t('privacy.stored.events'))}
          {item(Check, t('privacy.stored.minutes'))}
        </ul>
      </Section>

      <Section title={t('privacy.never')} kind="title">
        <ul className="flex flex-col gap-2">
          {item(X, t('privacy.never.content'))}
          {item(X, t('privacy.never.messages'))}
        </ul>
      </Section>

      <Section>
        <List>
          <Row
            leading={<Download size={24} strokeWidth={1.75} className="flex-shrink-0 text-ink" aria-hidden="true" />}
            label={t('privacy.export')}
            description={t('privacy.exportSub')}
            noChevron
            onClick={() => void exportLocalData()}
          />
          <label
            className={`flex min-h-14 w-full cursor-pointer items-center gap-4 px-4 py-3 text-left ${PRESSED} focus-within:ring-2 focus-within:ring-inset focus-within:ring-accent`}
          >
            <Upload size={24} strokeWidth={1.75} className="flex-shrink-0 text-ink" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-body text-ink">{t('privacy.import')}</span>
              <span className="mt-0.5 block text-body-s text-muted">{t('privacy.importSub')}</span>
            </span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={importLocalData}
              className="sr-only"
              aria-label={t('privacy.import')}
            />
          </label>
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex min-h-14 w-full items-center gap-4 px-4 py-3 text-left ${PRESSED} ${FOCUS_RING_INSET}`}
          >
            <ExternalLink size={24} strokeWidth={1.75} className="flex-shrink-0 text-ink" aria-hidden="true" />
            <span className="flex-1 text-body text-ink">{t('privacy.policy')}</span>
          </a>
        </List>
        {dataStatus && (
          <p
            role={dataStatus.type === 'error' ? 'alert' : 'status'}
            className={`mt-2 px-1 text-body-s ${dataStatus.type === 'error' ? 'text-lock' : 'text-muted'}`}
          >
            {dataStatus.message}
          </p>
        )}
      </Section>

      <button onClick={() => setConfirmDelete(true)} className={DANGER_BUTTON}>
        {t('privacy.deleteAll')}
      </button>

      {confirmDelete && (
        <Sheet title={t('privacy.deleteTitle')} onClose={() => setConfirmDelete(false)}>
          <p className="mt-2 text-body text-ink">{t('privacy.deleteText')}</p>
          <p className="mt-3 text-body-s text-muted">{t('privacy.deletePro')}</p>
          <div className="mt-6 flex flex-col gap-1">
            <button
              onClick={() => {
                setConfirmDelete(false);
                resetApp();
              }}
              className={DANGER_BUTTON}
            >
              {t('privacy.deleteConfirm')}
            </button>
            <TextButton onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</TextButton>
          </div>
        </Sheet>
      )}
    </Page>
  );
}
