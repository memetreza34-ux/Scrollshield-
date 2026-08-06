import { useState } from 'react';
import { AlertTriangle, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  createLegacyRecoveryFilename,
  createLegacyRecoveryPackage,
  serializeLegacyRecoveryPackage,
} from '../lib/legacyRecovery';

export function MigrationRecoveryScreen({ onRetry }: { onRetry: () => boolean }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const retryMigration = () => {
    setBusy(true);
    setStatus(null);
    try {
      const recovered = onRetry();
      if (!recovered) {
        setStatus(
          'Die Migration ist weiterhin blockiert. Deine alten Daten wurden nicht gelöscht. Sichere die Rohdaten und versuche es nach einem Neustart erneut.',
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const downloadRecovery = () => {
    setStatus(null);
    const recovery = createLegacyRecoveryPackage();
    if (!recovery) {
      setStatus('Es wurden keine ScrollShield-Rohdaten für eine Sicherung gefunden.');
      return;
    }

    const blob = new Blob([serializeLegacyRecoveryPackage(recovery)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = createLegacyRecoveryFilename();
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Rohdatensicherung wurde erstellt. Bewahre die Datei auf, bis die Migration bestätigt ist.');
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <section
        aria-labelledby="migration-recovery-title"
        className="w-full max-w-md rounded-[2rem] border border-amber-500/30 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
          <AlertTriangle aria-hidden="true" size={28} />
        </div>

        <h1 id="migration-recovery-title" className="text-center text-2xl font-black">
          Alte Daten sind geschützt
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-zinc-300">
          ScrollShield konnte die frühere Datenspeicherung noch nicht vollständig und sicher übernehmen. Die
          Originaldaten bleiben unverändert erhalten und normale Speicherungen sind vorübergehend gesperrt.
        </p>

        <div className="mt-5 rounded-2xl border border-zinc-700 bg-zinc-950/70 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-400" size={20} />
            <div>
              <h2 className="font-bold">Jetzt nicht zurücksetzen oder deinstallieren</h2>
              <p className="mt-1 text-sm leading-5 text-zinc-400">
                Erstelle zuerst die Rohdatensicherung. Sie enthält alle vorhandenen ScrollShield-Schlüssel einschließlich
                alter Quellen, Archive und einer eventuell unterbrochenen Transaktion.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={retryMigration}
            disabled={busy}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 font-black text-zinc-950 disabled:opacity-50"
          >
            <RefreshCw aria-hidden="true" size={18} className={busy ? 'animate-spin' : ''} />
            Migration erneut versuchen
          </button>
          <button
            type="button"
            onClick={downloadRecovery}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 font-bold text-zinc-100"
          >
            <Download aria-hidden="true" size={18} />
            Legacy-Rohdaten sichern
          </button>
        </div>

        <p className="mt-4 text-xs leading-5 text-zinc-500">
          Die Sicherung bleibt lokal auf deinem Gerät. ScrollShield sendet diese Daten nicht an einen Server.
        </p>

        {status && (
          <p role="status" aria-live="polite" className="mt-4 rounded-xl bg-zinc-800 p-3 text-sm text-zinc-300">
            {status}
          </p>
        )}
      </section>
    </main>
  );
}
