import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, Film, RefreshCw, Smartphone, TriangleAlert } from 'lucide-react';
import { Screen, SUPPORTED_APPS } from '../types';
import { Header, Page, Section, SecondaryButton } from '../components/ui';
import { t } from '../i18n';
import { formatClock } from '../lib/commitment';
import { AccessibilityDisclosure } from '../components/AccessibilityDisclosure';
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
  const [showDisclosure, setShowDisclosure] = useState(false);

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

  const formatTime = (timestamp: number) => (timestamp > 0 ? formatClock(timestamp) : '–');
  const card = 'rounded-surface border border-line bg-surface p-4';
  const code = 'text-[0.6875rem] leading-relaxed text-muted';

  return (
    <Page>
      {showDisclosure && (
        <AccessibilityDisclosure
          onAccept={() => {
            setShowDisclosure(false);
            void ScrollShieldBridge.openAccessibilitySettings().catch(() => undefined);
          }}
          onDecline={() => setShowDisclosure(false)}
        />
      )}
      <Header title={t('diag.title')} onBack={() => navigate('permissions')} />

      <p className="mb-6 text-body-s text-muted">{t('diag.intro')}</p>

      <section
        aria-labelledby="diagnostics-status"
        className={`mb-4 flex flex-col gap-3 rounded-surface p-4 ${accessibilityActive ? 'bg-accent/10' : 'bg-pause/10'}`}
      >
        <h2 id="diagnostics-status" className="flex items-center gap-2 text-title-s text-ink">
          {accessibilityActive ? (
            <CircleCheck size={20} strokeWidth={1.75} className="text-accent" aria-hidden="true" />
          ) : (
            <TriangleAlert size={20} strokeWidth={1.75} className="text-pause" aria-hidden="true" />
          )}
          {t(accessibilityActive ? 'diag.active' : 'diag.inactive')}
        </h2>
        <p className="text-body-s text-ink">{t(accessibilityActive ? 'diag.activeText' : 'diag.inactiveText')}</p>
        {!accessibilityActive && (
          <SecondaryButton onClick={() => setShowDisclosure(true)}>{t('status.switchOn')}</SecondaryButton>
        )}
      </section>

      <div className="mb-6">
        <SecondaryButton onClick={() => void refresh()}>
          <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
          {isLoading ? t('diag.loading') : t('diag.reload')}
        </SecondaryButton>
      </div>

      {usage.length > 0 && (
        <Section title={t('diag.usage')}>
          <div className="flex flex-col gap-2">
            {usage.map((entry) => (
              <div key={entry.packageName} className={`flex items-center justify-between gap-3 ${card}`}>
                <div className="min-w-0">
                  <p className="text-body text-ink">
                    {platformNameByPackage.get(entry.packageName) ?? entry.packageName}
                  </p>
                  <p className="text-caption text-muted">
                    {t('diag.lastSeen', { surface: entry.surfaceId, time: formatTime(entry.lastSeenAt) })}
                  </p>
                </div>
                <p className="flex-shrink-0 text-title-s text-ink">
                  {t('time.minutes', { minutes: entry.minutesToday })}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={t('diag.samples')}>
        {!available && (
          <div className={`flex flex-col gap-3 ${card}`}>
            <Smartphone size={20} strokeWidth={1.75} className="text-muted" aria-hidden="true" />
            <p className="text-body-s text-muted">{t('diag.noSamplesWeb')}</p>
          </div>
        )}

        {available && samples.length === 0 && <p className={`text-body-s text-muted ${card}`}>{t('diag.noSamples')}</p>}

        <div className="flex flex-col gap-3">
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
                className={`rounded-surface border p-4 ${matched ? 'border-accent/40 bg-accent/5' : 'border-line bg-surface'}`}
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-body text-ink">
                    <Film
                      size={16}
                      strokeWidth={2}
                      className={matched ? 'text-accent' : 'text-muted'}
                      aria-hidden="true"
                    />
                    {platformNameByPackage.get(sample.packageName) ?? sample.packageName}
                  </span>
                  <span className={`text-label-s ${matched ? 'text-accent' : 'text-muted'}`}>
                    {t(matched ? 'diag.matched' : 'diag.noMatch')}
                  </span>
                </div>

                <p className="mb-2 text-caption text-muted">{formatTime(sample.observedAt)}</p>

                {sample.classNames.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 text-label-s text-muted">{t('diag.class')}</p>
                    <div className="overflow-x-auto">
                      <code className={code}>{sample.classNames.join(', ')}</code>
                    </div>
                  </div>
                )}

                {sample.viewIds.length > 0 && (
                  <div>
                    <p className="mb-1 text-label-s text-muted">{t('diag.ids', { count: sample.viewIds.length })}</p>
                    <div className="max-h-32 overflow-x-auto overflow-y-auto">
                      <code className={code}>{sample.viewIds.map((viewId) => viewId.split('/').pop()).join(', ')}</code>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title={t('diag.signatures')}>
        <div className="flex flex-col gap-2">
          {SHORT_VIDEO_SIGNATURES.map((signature) => {
            const platform = SUPPORTED_APPS.find((app) => app.id === signature.platformId);
            return (
              <div key={signature.platformId} className={card}>
                <p className="mb-1 text-body text-ink">{platform?.name ?? signature.platformId}</p>
                {signature.alwaysShortVideo ? (
                  <p className="text-caption text-muted">{t('diag.wholeApp')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <code className={code}>{[...signature.viewIdHints, ...signature.classNameHints].join(', ')}</code>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <p className="text-caption text-muted">{t('diag.footer')}</p>
    </Page>
  );
}
