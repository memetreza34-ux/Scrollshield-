import { useEffect, useState } from 'react';
import { t } from '../i18n';

const START_SECONDS = 5;
/** Seconds the finished pause stays visible before the countdown starts over. */
const HOLD_SECONDS = 2;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.(REDUCED_MOTION).matches === true);
  useEffect(() => {
    const media = window.matchMedia?.(REDUCED_MOTION);
    if (!media) return;
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

/**
 * The pause screen in miniature for the welcome screen: the countdown runs from
 * 5 to 0, then "Weiter" becomes available, then it starts over. "Zurück" is
 * available all the time, as in the real pause. With reduced motion it stands
 * still at 5. Drawn in code, decorative for screen readers apart from its label.
 */
export function PausePreview() {
  const reduced = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTick(0);
    if (reduced) return;
    const interval = window.setInterval(
      () => setTick((previous) => (previous + 1) % (START_SECONDS + 1 + HOLD_SECONDS)),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [reduced]);

  const seconds = Math.max(START_SECONDS - tick, 0);
  const finished = seconds === 0;

  return (
    <div
      role="img"
      aria-label={t('welcome.preview')}
      className="w-[172px] rounded-[28px] border border-line bg-surface px-3 pb-3 pt-3"
    >
      <div aria-hidden="true" className="flex flex-col items-center">
        <span className="mb-2 h-1 w-10 rounded-full bg-line" />
        <span className="text-center text-[0.75rem] font-semibold leading-4 text-ink">
          {t('pause.title', { app: 'Instagram' })}
        </span>
        <span className="mt-1 text-[2rem] font-semibold leading-9 tracking-[-0.02em] text-ink">{seconds}</span>
        <span className="text-[0.625rem] font-medium leading-3 text-muted">{t('pause.seconds')}</span>
        <span className="mt-2 flex h-6 w-full items-center justify-center rounded-lg bg-accent text-[0.6875rem] font-semibold text-ground">
          {t('pause.back')}
        </span>
        <span
          className={`mt-1.5 flex h-6 w-full items-center justify-center rounded-lg border border-line bg-raised text-[0.6875rem] font-semibold text-ink transition-opacity duration-150 ${finished ? '' : 'opacity-[0.38]'}`}
        >
          {t('pause.continue')}
        </span>
      </div>
    </div>
  );
}
