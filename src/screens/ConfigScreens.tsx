import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Check, Download, ExternalLink, Smartphone, Upload, X, type LucideIcon } from 'lucide-react';
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
