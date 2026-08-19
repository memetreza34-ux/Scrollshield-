import { AlertTriangle, LockKeyhole, Power } from 'lucide-react';
import type { NativeProtectionStatus } from '../lib/nativeProtection';
import {
  describeNativeProtectionHealth,
  formatNativeLifecycleTime,
} from '../lib/nativeProtectionHealth';

export function NativeProtectionStatusPanel({
  status,
  busy,
  onToggle,
  stopLocked = false,
  stopLockedMessage,
}: {
  status: NativeProtectionStatus | null;
  busy: boolean;
  onToggle: () => void;
  stopLocked?: boolean;
  stopLockedMessage?: string;
}) {
  const presentation = describeNativeProtectionHealth(status);
  const running = status?.running ?? false;
  const processRecovery = status?.health === 'unclean-process-stop';
  const stopActionLocked = running && stopLocked;
  const toneClasses =
    presentation.tone === 'positive'
      ? 'border-emerald-500/30 bg-emerald-500/5'
      : presentation.tone === 'warning'
        ? 'border-amber-500/30 bg-amber-500/5'
        : 'border-zinc-800 bg-zinc-900/70';
  const iconClass =
    presentation.tone === 'positive'
      ? 'text-emerald-400'
      : presentation.tone === 'warning'
        ? 'text-amber-400'
        : 'text-zinc-500';
  const badgeClass =
    presentation.tone === 'positive'
      ? 'text-emerald-400'
      : presentation.tone === 'warning'
        ? 'text-amber-400'
        : 'text-zinc-500';

  return (
    <section
      aria-labelledby="protection-service-title"
      className={`rounded-[1.75rem] border p-5 ${toneClasses}`}
    >
      <div className="flex items-start gap-3">
        {presentation.tone === 'warning' ? (
          <AlertTriangle aria-hidden="true" size={20} className={iconClass} />
        ) : (
          <Power aria-hidden="true" size={20} className={iconClass} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="protection-service-title" className="font-bold text-zinc-100">
                Android-Schutzdienst
              </h2>
              <p className="mt-1 text-sm font-semibold text-zinc-200">{presentation.title}</p>
            </div>
            <span className={`text-right text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
              {presentation.badge}
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-zinc-400">{presentation.message}</p>

          {presentation.showLastStop && status && (
            <dl className="mt-4 space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Letzter Stopp:</dt>
                <dd className="text-right text-zinc-300">{formatNativeLifecycleTime(status.lastStopAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Stoppcode:</dt>
                <dd className="break-all text-right font-mono text-amber-300">
                  {status.lastStopCode || 'Nicht vorhanden'}
                </dd>
              </div>
            </dl>
          )}

          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            Der Schutz läuft lokal als sichtbarer Hintergrunddienst. Benachrichtigungen müssen aktiv bleiben; Android
            kann den Dienst weiterhin über seine Systemoberflächen beenden.
          </p>

          {stopActionLocked && (
            <div className="mt-4 flex gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3 text-xs leading-relaxed text-indigo-100">
              <LockKeyhole size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              <p>
                {stopLockedMessage ||
                  'Der normale Stopp in ScrollShield ist während Commitment gesperrt. Schutzstatus und Berechtigungen können weiterhin repariert werden.'}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onToggle}
            disabled={busy || stopActionLocked}
            className={`mt-4 w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50 ${
              running ? 'bg-zinc-800 text-zinc-200' : 'bg-emerald-500 text-emerald-950'
            }`}
          >
            {busy
              ? processRecovery
                ? 'Wiederherstellung läuft…'
                : 'Wird geändert…'
              : stopActionLocked
                ? 'Stop während Commitment gesperrt'
                : running
                  ? 'Schutzdienst stoppen'
                  : processRecovery
                    ? 'Schutz wiederherstellen'
                    : 'Schutzdienst starten'}
          </button>
        </div>
      </div>
    </section>
  );
}
