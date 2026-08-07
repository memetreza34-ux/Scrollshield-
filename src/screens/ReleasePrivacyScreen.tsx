import { useEffect, useRef, type SyntheticEvent } from 'react';
import { LockKeyhole } from 'lucide-react';
import { isCommitmentLockActive, type CommitmentLock } from '../lib/commitmentLock';
import type { AppState, Screen } from '../types';
import { PrivacyScreen } from './ConfigScreens';

const IMPORT_SELECTOR = 'input[type="file"][aria-label="ScrollShield JSON-Export importieren"]';

export function ReleasePrivacyScreen({
  state,
  updateState,
  resetApp,
  navigate,
  commitmentLock = null,
}: {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  resetApp: () => void;
  navigate: (screen: Screen) => void;
  commitmentLock?: CommitmentLock | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const commitmentActive = isCommitmentLockActive(commitmentLock);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const syncImportState = () => {
      const input = root.querySelector<HTMLInputElement>(IMPORT_SELECTOR);
      if (!input) return;
      input.disabled = commitmentActive;
      input.setAttribute('aria-disabled', commitmentActive ? 'true' : 'false');
    };

    syncImportState();
    const observer = new MutationObserver(syncImportState);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [commitmentActive]);

  const blockImportEvent = (event: SyntheticEvent<HTMLDivElement>) => {
    if (!commitmentActive) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches(IMPORT_SELECTOR)) return;
    event.preventDefault();
    event.stopPropagation();
    target.value = '';
  };

  return (
    <div ref={rootRef} onClickCapture={blockImportEvent} onChangeCapture={blockImportEvent}>
      {commitmentActive && commitmentLock && (
        <div
          role="status"
          className="mx-6 mt-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs leading-relaxed text-indigo-100"
        >
          <div className="flex items-start gap-3">
            <LockKeyhole size={17} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <strong className="block">Backup-Import ist während Commitment gesperrt</strong>
              <span className="mt-1 block text-indigo-200/75">
                Ein Vollimport könnte Schutzregeln ersetzen und bleibt deshalb bis{' '}
                {new Date(commitmentLock.lockedUntil).toLocaleString('de-DE')} deaktiviert. Export, Datenlöschung und ein
                kompletter Reset bleiben verfügbar.
              </span>
            </div>
          </div>
        </div>
      )}
      <PrivacyScreen state={state} updateState={updateState} resetApp={resetApp} navigate={navigate} />
    </div>
  );
}
