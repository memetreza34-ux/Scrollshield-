import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { Screen } from '../types';
import { getLanguage, t } from '../i18n';
import { formatMinutes } from '../lib/format';
import { DAILY_GOAL_OPTIONS } from '../lib/state';
import type { DayMark } from '../lib/metrics';
import { SkyScene, dayPartAt } from './SkyScene';
import { OptionList, Sheet } from './ui';
import { FOCUS_RING, PRESSED } from './styles';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const prefersReducedMotion = () => window.matchMedia?.(REDUCED_MOTION).matches === true;

/** Counts up to `target` once, like a gauge settling; with reduced motion it shows the value at once. */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export type StartStatus = 'active' | 'limited' | 'off' | 'preview';

const STATUS_STYLE: Record<StartStatus, string> = {
  active: 'bg-accent/15 text-accent',
  limited: 'bg-pause/15 text-pause',
  off: 'bg-lock/15 text-lock',
  preview: 'bg-raised text-muted',
};

const GREETINGS = {
  morning: 'start.greeting.morning',
  day: 'start.greeting.day',
  evening: 'start.greeting.evening',
  night: 'start.greeting.night',
} as const;

/**
 * The top of "Start": the sky of the time of day, a greeting with the date,
 * the protection status as a small pill (it turns gold or rose when
 * something is missing) and the settings gear. Bleeds to the screen edges.
 */
export function StartHero({
  now,
  status,
  onStatus,
  navigate,
}: {
  now: Date;
  status: StartStatus;
  onStatus: () => void;
  navigate: (s: Screen) => void;
}) {
  const part = dayPartAt(now);
  const date = new Intl.DateTimeFormat(getLanguage() === 'de' ? 'de-DE' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);

  return (
    <header className="relative -mx-4 mb-2 h-52 overflow-hidden">
      <SkyScene part={part} />
      {/* Covers the anti-aliased lower edge of the drawing, so the sky melts into the page. */}
      <div aria-hidden="true" className="absolute inset-x-0 -bottom-px h-20 bg-gradient-to-b from-ground/0 to-ground" />
      <div className="relative flex items-center justify-between px-4 pt-3">
        <button
          onClick={onStatus}
          className={`flex min-h-11 items-center gap-2 rounded-full px-3 text-label-s ${STATUS_STYLE[status]} ${PRESSED} ${FOCUS_RING}`}
        >
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
          {t(`start.status.${status}`)}
        </button>
        <button
          onClick={() => navigate('settings')}
          aria-label={t('common.settings')}
          className={`-mr-2 flex h-12 w-12 items-center justify-center rounded-full text-ink ${PRESSED} ${FOCUS_RING}`}
        >
          <Settings size={24} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <h1 className="text-headline text-ink">{t(GREETINGS[part])}</h1>
        <p className="text-body-s text-muted">{date}</p>
      </div>
    </header>
  );
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The daily goal as a ring: minutes in the protected apps today against the
 * goal the user set. Green while inside the goal, gold once over it – a
 * fact, no scolding. Tapping it changes the goal.
 */
export function GoalCard({
  used,
  goal,
  measured,
  isWeb,
  totalMinutes,
  usualByNow,
  onEdit,
}: {
  used: number;
  goal: number;
  measured: boolean;
  isWeb: boolean;
  totalMinutes?: number;
  /** Average minutes in the protected apps by this time of day on recent days; undefined without enough days. */
  usualByNow?: number;
  onEdit: () => void;
}) {
  const shown = useCountUp(measured ? used : 0);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const over = measured && used > goal;
  const progress = measured ? Math.min(1, used / goal) : 0;
  const difference = usualByNow === undefined ? 0 : used - usualByNow;

  return (
    <div className="flex items-center gap-5 rounded-surface border border-line bg-surface p-4">
      <button
        onClick={onEdit}
        aria-label={`${
          measured
            ? t('start.goal.ring', { used: formatMinutes(used), goal: formatMinutes(goal) })
            : t('start.goal.notMeasured')
        }. ${t('start.goal.edit', { goal: formatMinutes(goal) })}`}
        className={`relative flex-shrink-0 rounded-full ${PRESSED} ${FOCUS_RING}`}
      >
        <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">
          <circle
            cx="56"
            cy="56"
            r={RADIUS}
            fill="none"
            className="stroke-line"
            strokeWidth="10"
            strokeDasharray={measured ? undefined : '4 6'}
          />
          {measured && (
            <circle
              cx="56"
              cy="56"
              r={RADIUS}
              fill="none"
              className={over ? 'stroke-pause' : 'stroke-accent'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={drawn ? CIRCUMFERENCE * (1 - progress) : CIRCUMFERENCE}
              transform="rotate(-90 56 56)"
              style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.2, 0.7, 0.2, 1)' }}
            />
          )}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-title text-ink">{measured ? shown : '–'}</span>
          <span className="text-caption text-muted">{t('start.goal.of', { goal })}</span>
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-label-s text-muted">{t('start.goal.title')}</p>
        {measured ? (
          <>
            <p className={`mt-1 text-title-s ${over ? 'text-pause' : 'text-ink'}`}>
              {over
                ? t('start.goal.over', { time: formatMinutes(used - goal) })
                : used === goal
                  ? t('start.goal.reached')
                  : t('start.goal.left', { time: formatMinutes(goal - used) })}
            </p>
            <div className="mt-2 flex flex-col gap-0.5 text-body-s text-muted">
              {totalMinutes !== undefined && (
                <span>{t('start.goal.total', { time: formatMinutes(totalMinutes) })}</span>
              )}
              {Math.abs(difference) >= 5 && (
                <span className={difference < 0 ? 'text-accent' : ''}>
                  {difference < 0
                    ? t('start.goal.belowAverage', { time: formatMinutes(-difference) })
                    : t('start.goal.aboveAverage', { time: formatMinutes(difference) })}
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-title-s text-ink">{t('start.goal.notMeasured')}</p>
            <p className="mt-1 text-body-s text-muted">
              {t(isWeb ? 'start.goal.webText' : 'start.goal.notMeasuredText')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Choosing the daily goal. */
export function GoalSheet({
  goal,
  onChange,
  onClose,
}: {
  goal: number;
  onChange: (minutes: number) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={t('start.goal.sheetTitle')} onClose={onClose}>
      <p className="mb-4 text-body-s text-muted">{t('start.goal.sheetText')}</p>
      <OptionList<string>
        label={t('start.goal.sheetTitle')}
        value={String(goal)}
        onChange={(value) => {
          onChange(Number(value));
          onClose();
        }}
        options={DAILY_GOAL_OPTIONS.map((minutes) => ({ value: String(minutes), label: formatMinutes(minutes) }))}
      />
    </Sheet>
  );
}

/**
 * "Your day" as a timeline from the morning to midnight: bars for the
 * minutes in the protected apps per hour, and above them a dot for every
 * interruption – green where the user went back, gold where the app was
 * opened anyway. The line marks now.
 */
export function DayTimeline({ perHour, marks, now }: { perHour?: number[]; marks: DayMark[]; now: Date }) {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const hourNow = now.getHours();
  const firstActive = Math.min(
    ...marks.map((mark) => new Date(mark.timestamp).getHours()),
    ...(perHour ?? []).flatMap((minutes, hour) => (minutes > 0 ? [hour] : [])),
    6,
  );
  const startHour = Math.max(0, Math.min(firstActive, hourNow));
  const hours = Array.from({ length: 24 - startHour }, (_, index) => startHour + index);
  const span = (24 - startHour) * 3_600_000;
  const position = (timestamp: number) =>
    Math.min(100, Math.max(0, ((timestamp - startOfDay.getTime() - startHour * 3_600_000) / span) * 100));
  const highest = Math.max(15, ...(perHour ?? [0]));
  const totalMinutes = (perHour ?? []).reduce((sum, minutes) => sum + minutes, 0);
  const wentBack = marks.filter((mark) => mark.wentBack).length;
  const quiet = marks.length === 0 && totalMinutes === 0;
  const ticks = [startHour, 12, 18, 24].filter((hour, index, all) => hour >= startHour && all.indexOf(hour) === index);

  return (
    <div className="rounded-surface border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-title-s text-ink">{t('start.day.title')}</h2>
        {marks.length > 0 && (
          <span className="text-body-s text-muted">
            {t('start.day.summary', { count: marks.length, back: wentBack })}
          </span>
        )}
      </div>

      <div
        role="img"
        aria-label={t('start.day.label', { minutes: totalMinutes, count: marks.length, back: wentBack })}
        className="relative mt-4"
      >
        <div className="relative h-4">
          {marks.map((mark, index) => (
            <span
              key={`${mark.timestamp}-${index}`}
              className={`grow absolute top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full ${
                mark.wentBack ? 'bg-accent' : 'bg-pause'
              }`}
              style={{ left: `${position(mark.timestamp)}%`, animationDelay: '0.5s' }}
            />
          ))}
        </div>
        <div className="mt-1 flex h-16 items-end gap-[2px]">
          {hours.map((hour, index) => {
            const minutes = perHour?.[hour] ?? 0;
            const future = hour > hourNow;
            return (
              <span
                key={hour}
                className={`grow flex-1 rounded-t-[3px] ${future ? 'bg-raised' : minutes > 0 ? 'bg-accent/60' : 'bg-line'}`}
                style={{
                  height: future || minutes === 0 ? '3px' : `${Math.max(8, (minutes / highest) * 100)}%`,
                  animationDelay: `${0.15 + index * 0.02}s`,
                }}
              />
            );
          })}
        </div>
        <span
          aria-hidden="true"
          className="absolute bottom-0 top-0 w-px bg-ink/50"
          style={{ left: `${position(now.getTime())}%` }}
        />
      </div>

      <div className="mt-1 flex justify-between text-caption text-faint" aria-hidden="true">
        {ticks.map((hour) => (
          <span key={hour}>{hour}</span>
        ))}
      </div>

      {quiet ? (
        <p className="mt-3 text-body-s text-muted">{t('start.day.quiet')}</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-accent/60" />
            {t('start.day.legend.usage')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" />
            {t('start.day.legend.back')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-pause" />
            {t('start.day.legend.opened')}
          </span>
        </div>
      )}
    </div>
  );
}
