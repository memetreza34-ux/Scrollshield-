import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Film, RefreshCw, Smartphone } from 'lucide-react';
import { Screen, SUPPORTED_APPS } from '../types';
import { Header } from '../components/ui';
import { CalibrationSample, ScrollShieldBridge, ShortVideoUsageEntry, readShortVideoUsage } from '../lib/nativeBridge';
import { SHORT_VIDEO_SIGNATURES, getShortVideoSignature, matchesShortVideoSurface } from '../lib/shortVideoSignatures';

/**
 * Calibration screen for the short-video detection.
 *
 * Feed rules only work when the detection signatures still match the installed
 * version of a host app, and view ids are not a stable API — Instagram can
 * rename them in any release, after which detection fails silently. This screen
 * shows what the accessibility service actually observed on this device, so a
 * broken signature can be identified instead of guessed at.
 *
 * It ships in production on purpose: the check is only meaningful on a real
 * phone with the real apps installed.
 */

const platformNameByPackage = new Map(
  SUPPORTED_APPS.flatMap((platform) => platform.androidPackages.map((pkg) => [pkg, platform.name] as const)),
);

const platformIdByPackage = new Map(
  SUPPORTED_APPS.flatMap((platform) => platform.androidPackages.map((pkg) => [pkg, platform.id] as const)),
);

export function DiagnosticsScreen({ navigate }: { navigate: (screen: Screen) => void }) {
  const [accessibilityActive, setAccessibilityActive] = useState(false);
  const [samples, setSamples] = useState<CalibrationSample[]>([]);
  const [usage, setUsage] = useState<ShortVideoUsageEntry[]>([]);
  const [available, setAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = await ScrollShieldBridge.getPermissionStatus();
      setAccessibilityActive(status.accessibility);

      const calibration = await ScrollShieldBridge.getCalibrationSamples();
      setAvailable(calibration.available);
      setSamples([...calibration.samples].reverse());

      const usageResult = await readShortVideoUsage();
      setUsage(usageResult.entries);
    } catch {
      setAvailable(false);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const formatTime = (timestamp: number) =>
    timestamp > 0 ? new Date(timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '–';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
      <Header title="Erkennung pruefen" onBack={() => navigate('settings')} />

      <p className="mb-6 text-sm leading-relaxed text-zinc-400">
        Kurzvideo-Regeln funktionieren nur, wenn ScrollShield den Feed der jeweiligen App erkennt. Die Erkennung stuetzt
        sich auf technische Kennungen, die die Apps jederzeit umbenennen koennen. Hier siehst du, was auf diesem Geraet
        wirklich ankommt.
      </p>

      <section
        aria-labelledby="diagnostics-status"
        className={`mb-6 rounded-[1.5rem] border p-5 ${accessibilityActive ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}
      >
        <h2 id="diagnostics-status" className="mb-2 flex items-center gap-2 font-bold text-zinc-100">
          {accessibilityActive ? (
            <CheckCircle2 size={18} className="text-emerald-400" aria-hidden="true" />
          ) : (
            <AlertTriangle size={18} className="text-amber-400" aria-hidden="true" />
          )}
          Kurzvideo-Erkennung {accessibilityActive ? 'aktiv' : 'inaktiv'}
        </h2>
        <p className="text-sm leading-relaxed text-zinc-300">
          {accessibilityActive
            ? 'Der Dienst laeuft. Oeffne den Feed einer geschuetzten App und komm hierher zurueck.'
            : 'Ohne aktivierte Bedienungshilfe kann ScrollShield keinen Kurzvideo-Feed erkennen. App-Verzoegerungen und Sperren funktionieren weiterhin.'}
        </p>
        {!accessibilityActive && (
          <button
            onClick={() => void ScrollShieldBridge.openAccessibilitySettings()}
            className="mt-4 w-full rounded-[1.25rem] bg-zinc-100 py-3 text-sm font-bold text-zinc-950"
          >
            In den Einstellungen aktivieren
          </button>
        )}
      </section>

      <button
        onClick={() => void refresh()}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-zinc-800 bg-zinc-900/70 py-3 text-sm font-semibold text-zinc-300"
      >
        <RefreshCw size={16} aria-hidden="true" />
        {isLoading ? 'Wird geladen …' : 'Neu laden'}
      </button>

      {usage.length > 0 && (
        <section aria-labelledby="diagnostics-usage" className="mb-6">
          <h2 id="diagnostics-usage" className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
            Kurzvideo-Zeit heute
          </h2>
          <div className="space-y-2">
            {usage.map((entry) => (
              <div
                key={entry.packageName}
                className="flex items-center justify-between rounded-2xl border border-zinc-800/50 bg-zinc-900/70 p-4"
              >
                <div>
                  <div className="text-sm font-semibold text-zinc-200">
                    {platformNameByPackage.get(entry.packageName) ?? entry.packageName}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {entry.surfaceId} · zuletzt {formatTime(entry.lastSeenAt)}
                  </div>
                </div>
                <div className="text-lg font-bold tabular-nums text-zinc-100">{entry.minutesToday} Min</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="diagnostics-samples" className="mb-6">
        <h2 id="diagnostics-samples" className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
          Zuletzt beobachtet
        </h2>

        {!available && (
          <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/70 p-5 text-sm leading-relaxed text-zinc-400">
            <Smartphone size={18} className="mb-3 text-zinc-500" aria-hidden="true" />
            Auf diesem Geraet stehen keine Beobachtungen zur Verfuegung. Im Browser gibt es keine Bedienungshilfe –
            oeffne diese Seite in der Android-App.
          </div>
        )}

        {available && samples.length === 0 && (
          <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/70 p-5 text-sm leading-relaxed text-zinc-400">
            Noch nichts beobachtet. Oeffne eine geschuetzte App, wechsle in ihren Kurzvideo-Feed und lade hier neu.
          </div>
        )}

        <div className="space-y-3">
          {samples.map((sample, index) => {
            const platformId = platformIdByPackage.get(sample.packageName);
            const signature = platformId ? getShortVideoSignature(platformId) : undefined;
            const matched = matchesShortVideoSurface(signature, {
              viewIds: sample.viewIds,
              classNames: sample.classNames,
            });

            return (
              <div
                key={`${sample.packageName}-${sample.observedAt}-${index}`}
                className={`rounded-2xl border p-4 ${matched ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800/50 bg-zinc-900/70'}`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Film size={14} className={matched ? 'text-emerald-400' : 'text-zinc-600'} aria-hidden="true" />
                    <span className="text-sm font-semibold text-zinc-200">
                      {platformNameByPackage.get(sample.packageName) ?? sample.packageName}
                    </span>
                  </div>
                  <span className={`text-xs font-bold ${matched ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {matched ? 'ERKANNT' : 'kein Treffer'}
                  </span>
                </div>

                <div className="mb-2 text-[11px] text-zinc-500">{formatTime(sample.observedAt)}</div>

                {sample.classNames.length > 0 && (
                  <div className="mb-2">
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-600">Klasse</div>
                    <div className="overflow-x-auto">
                      <code className="text-[11px] leading-relaxed text-zinc-400">{sample.classNames.join(', ')}</code>
                    </div>
                  </div>
                )}

                {sample.viewIds.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                      Kennungen ({sample.viewIds.length})
                    </div>
                    <div className="max-h-32 overflow-y-auto overflow-x-auto">
                      <code className="text-[11px] leading-relaxed text-zinc-400">
                        {sample.viewIds.map((viewId) => viewId.split('/').pop()).join(', ')}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="diagnostics-signatures" className="mb-6">
        <h2 id="diagnostics-signatures" className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
          Hinterlegte Erkennung
        </h2>
        <div className="space-y-2">
          {SHORT_VIDEO_SIGNATURES.map((signature) => {
            const platform = SUPPORTED_APPS.find((app) => app.id === signature.platformId);
            return (
              <div
                key={signature.platformId}
                className="rounded-2xl border border-zinc-800/50 bg-zinc-900/70 p-4 text-sm"
              >
                <div className="mb-1 font-semibold text-zinc-200">{platform?.name ?? signature.platformId}</div>
                {signature.alwaysShortVideo ? (
                  <div className="text-xs text-emerald-400">Ganze App ist ein Kurzvideo-Feed – kann nicht brechen.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <code className="text-[11px] leading-relaxed text-zinc-500">
                      {[...signature.viewIdHints, ...signature.classNameHints].join(', ')}
                    </code>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-xs leading-relaxed text-zinc-600">
        Wenn ein Feed offen war und trotzdem „kein Treffer" steht, passt die hinterlegte Erkennung nicht mehr zur
        installierten App-Version. Die Kennungen oben zeigen, woran ScrollShield den Feed stattdessen erkennen koennte.
        ScrollShield liest dabei ausschliesslich diese technischen Kennungen – keine Texte, Nachrichten oder Eingaben.
      </p>
    </motion.div>
  );
}
