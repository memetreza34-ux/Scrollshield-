import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Settings, Shield } from 'lucide-react';
import { Screen } from '../types';
import { getLanguage, t } from '../i18n';
import { formatMinutes } from '../lib/format';
import { DAILY_GOAL_OPTIONS } from '../lib/state';
import { useAppIcon } from '../lib/appIcons';
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

const CARD = 'rounded-surface border border-line bg-surface';
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Draws once after mounting, so rings and bars move in from zero. */
function useDrawn() {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return drawn;
}

/** "Not measured" instead of a zero, with the reason in one sentence. */
function NotMeasured({ title, isWeb }: { title: string; isWeb: boolean }) {
  return (
    <div className={`${CARD} p-5`}>
      <p className="text-title-s text-ink">{title}</p>
      <p className="mt-1 text-body-s text-muted">{t(isWeb ? 'start.goal.webText' : 'start.goal.notMeasuredText')}</p>
    </div>
  );
}

/**
 * Screen time like the system's own overview: today's total with the
 * difference to a usual day by this time, a bar per hour – social media in
 * mint, the rest in quiet blue – the most used apps and the unlocks.
 */
export function ScreenTimeCard({
  total,
  perHour,
  socialPerHour,
  usualByNow,
  topApps,
  protectedPackages,
  unlocks,
  firstUnlockAt,
  isWeb,
  now,
}: {
  total?: number;
  perHour?: number[];
  socialPerHour?: number[];
  usualByNow?: number;
  topApps?: { packageName: string; label: string; minutes: number }[];
  protectedPackages: Set<string>;
  unlocks?: number;
  firstUnlockAt?: number;
  isWeb: boolean;
  now: Date;
}) {
  const drawn = useDrawn();
  if (total === undefined) return <NotMeasured title={t('start.screen.notMeasured')} isWeb={isWeb} />;

  const social = (socialPerHour ?? []).reduce((sum, minutes) => sum + minutes, 0);
  const percent = usualByNow ? Math.round(((total - usualByNow) / usualByNow) * 100) : 0;
  const hourNow = now.getHours();
  const most = topApps?.[0]?.minutes ?? 1;

  return (
    <div className={`${CARD} p-5`}>
      <p className="text-label-s text-muted">{t('start.screen.today')}</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <p className="text-number text-ink">{formatMinutes(total)}</p>
        {usualByNow !== undefined && Math.abs(percent) >= 5 && (
          <p className={`flex items-center gap-1 pb-1 text-body-s ${percent < 0 ? 'text-accent' : 'text-pause'}`}>
            {percent < 0 ? (
              <ArrowDown size={16} strokeWidth={2} aria-hidden="true" />
            ) : (
              <ArrowUp size={16} strokeWidth={2} aria-hidden="true" />
            )}
            {t(percent < 0 ? 'start.screen.less' : 'start.screen.more', { percent: Math.abs(percent) })}
          </p>
        )}
      </div>

      {perHour && (
        <>
          <div
            role="img"
            aria-label={t('start.screen.chart', { time: formatMinutes(total), social: formatMinutes(social) })}
            className="relative mt-5 h-32"
          >
            {[0, 50, 100].map((line) => (
              <span
                key={line}
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-dashed border-line"
                style={{ bottom: `${line}%` }}
              />
            ))}
            <span aria-hidden="true" className="absolute -top-1 right-0 text-caption text-faint">
              60
            </span>
            <span aria-hidden="true" className="absolute bottom-[calc(50%-0.25rem)] right-0 text-caption text-faint">
              30
            </span>
            <div className="absolute inset-y-0 left-0 right-6 flex items-end gap-[3px]">
              {perHour.map((minutes, hour) => {
                const socialMinutes = Math.min(minutes, socialPerHour?.[hour] ?? 0);
                const future = hour > hourNow;
                return (
                  <span key={hour} className="flex h-full flex-1 flex-col justify-end">
                    {future ? (
                      <span className="h-[3px] rounded-full bg-raised" />
                    ) : (
                      <span
                        className="flex flex-col justify-end overflow-hidden rounded-t-[3px] transition-[height] duration-700 ease-out"
                        style={{
                          height: drawn
                            ? `${Math.max(minutes > 0 ? 4 : 2, (Math.min(60, minutes) / 60) * 100)}%`
                            : '0%',
                          transitionDelay: `${hour * 15}ms`,
                        }}
                      >
                        <span className="bg-muted/35" style={{ flexGrow: Math.max(0, minutes - socialMinutes) }} />
                        <span className="bg-accent" style={{ flexGrow: socialMinutes }} />
                        {minutes === 0 && <span className="h-full bg-line" />}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="mr-6 mt-2 flex justify-between text-caption text-faint" aria-hidden="true">
            <span>0</span>
            <span>6</span>
            <span>12</span>
            <span>18</span>
            <span>24</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-body-s">
            <span className="flex items-center gap-2 text-ink">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-accent" />
              {t('start.screen.social')}
              <span className="text-muted">{formatMinutes(social)}</span>
            </span>
            <span className="flex items-center gap-2 text-ink">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-muted/35" />
              {t('start.screen.other')}
              <span className="text-muted">{formatMinutes(Math.max(0, total - social))}</span>
            </span>
          </div>
        </>
      )}

      {topApps && topApps.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-label-s text-muted">{t('start.screen.mostUsed')}</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {topApps.map((app) => (
              <TopAppRow
                key={app.packageName}
                app={app}
                share={app.minutes / most}
                drawn={drawn}
                isProtected={protectedPackages.has(app.packageName)}
              />
            ))}
          </ul>
        </div>
      )}

      {unlocks !== undefined && (
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
          <div>
            <p className="text-label-s text-muted">{t('start.screen.unlocks')}</p>
            <p className="mt-1 text-title text-ink">{t('start.screen.unlocksValue', { count: unlocks })}</p>
          </div>
          {firstUnlockAt !== undefined && (
            <div>
              <p className="text-label-s text-muted">{t('start.screen.firstUnlock')}</p>
              <p className="mt-1 text-title text-ink">
                {new Intl.DateTimeFormat(getLanguage() === 'de' ? 'de-DE' : 'en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(firstUnlockAt)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TopAppRow({
  app,
  share,
  drawn,
  isProtected,
}: {
  app: { packageName: string; label: string; minutes: number };
  share: number;
  drawn: boolean;
  isProtected: boolean;
}) {
  const icon = useAppIcon([app.packageName]);
  return (
    <li className="flex items-center gap-3">
      {icon ? (
        <img src={icon} alt="" className="h-9 w-9 flex-shrink-0 rounded-[10px]" />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-raised text-label-s text-ink"
        >
          {app.label.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-body text-ink">
          {app.label}
          {isProtected && (
            <Shield size={14} strokeWidth={2} className="text-accent" aria-label={t('start.screen.protected')} />
          )}
        </span>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-raised">
          <span
            className={`block h-full rounded-full transition-[width] duration-700 ease-out ${isProtected ? 'bg-accent' : 'bg-muted/50'}`}
            style={{ width: drawn ? `${Math.max(4, share * 100)}%` : '0%' }}
          />
        </span>
      </span>
      <span className="w-20 flex-shrink-0 text-right text-body-s text-muted">{formatMinutes(app.minutes)}</span>
    </li>
  );
}

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
  usualByNow,
  onEdit,
}: {
  used: number;
  goal: number;
  measured: boolean;
  isWeb: boolean;
  /** Average minutes in the protected apps by this time of day on recent days; undefined without enough days. */
  usualByNow?: number;
  onEdit: () => void;
}) {
  const shown = useCountUp(measured ? used : 0);
  const drawn = useDrawn();
  if (!measured) return <NotMeasured title={t('start.goal.notMeasured')} isWeb={isWeb} />;

  const over = used > goal;
  const progress = Math.min(1, used / goal);
  const difference = usualByNow === undefined ? 0 : used - usualByNow;

  return (
    <div className={`${CARD} flex items-center gap-5 p-5`}>
      <button
        onClick={onEdit}
        aria-label={`${t('start.goal.ring', { used: formatMinutes(used), goal: formatMinutes(goal) })}. ${t(
          'start.goal.edit',
          { goal: formatMinutes(goal) },
        )}`}
        className={`relative flex-shrink-0 rounded-full ${PRESSED} ${FOCUS_RING}`}
      >
        <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">
          <circle cx="64" cy="64" r={RADIUS} fill="none" className="stroke-line" strokeWidth="11" />
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            className={over ? 'stroke-pause' : 'stroke-accent'}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={drawn ? CIRCUMFERENCE * (1 - progress) : CIRCUMFERENCE}
            transform="rotate(-90 64 64)"
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.2, 0.7, 0.2, 1)' }}
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-number text-ink">{shown}</span>
          <span className="text-caption text-muted">{t('start.goal.of', { goal })}</span>
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-label-s text-muted">{t('start.goal.title')}</p>
        <p className={`mt-1 text-title-s ${over ? 'text-pause' : 'text-ink'}`}>
          {over
            ? t('start.goal.over', { time: formatMinutes(used - goal) })
            : used === goal
              ? t('start.goal.reached')
              : t('start.goal.left', { time: formatMinutes(goal - used) })}
        </p>
        {Math.abs(difference) >= 5 && (
          <p className={`mt-2 text-body-s ${difference < 0 ? 'text-accent' : 'text-muted'}`}>
            {difference < 0
              ? t('start.goal.belowAverage', { time: formatMinutes(-difference) })
              : t('start.goal.aboveAverage', { time: formatMinutes(difference) })}
          </p>
        )}
        <button
          onClick={onEdit}
          className={`-ml-2 mt-2 min-h-11 rounded-control px-2 text-label-s text-accent ${PRESSED} ${FOCUS_RING}`}
        >
          {t('start.goal.change')}
        </button>
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
 * The day's slow-downs: three numbers – slowed, went back, opened anyway –
 * and a dot for each on a line from the morning to midnight; green where the
 * user went back, gold where the app was opened. The thin line marks now.
 */
export function BrakesCard({ marks, now }: { marks: DayMark[]; now: Date }) {
  const back = marks.filter((mark) => mark.wentBack).length;
  const opened = marks.length - back;
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startHour = Math.max(
    0,
    Math.min(6, now.getHours(), ...marks.map((mark) => new Date(mark.timestamp).getHours())),
  );
  const span = (24 - startHour) * 3_600_000;
  const position = (timestamp: number) =>
    Math.min(100, Math.max(0, ((timestamp - startOfDay.getTime() - startHour * 3_600_000) / span) * 100));

  if (marks.length === 0) {
    return (
      <div className={`${CARD} p-5`}>
        <p className="text-body text-muted">{t('start.brakes.none')}</p>
      </div>
    );
  }

  const tiles = [
    { value: marks.length, label: t('start.brakes.slowed'), color: 'text-ink' },
    { value: back, label: t('start.brakes.back'), color: 'text-accent' },
    { value: opened, label: t('start.brakes.opened'), color: 'text-pause' },
  ];

  return (
    <div className={`${CARD} p-5`}>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-control bg-raised px-3 py-3">
            <p className={`text-number ${tile.color}`}>{tile.value}</p>
            <p className="text-body-s text-muted">{tile.label}</p>
          </div>
        ))}
      </div>

      <div
        role="img"
        aria-label={t('start.brakes.label', { count: marks.length, back, opened })}
        className="relative mt-5 h-6"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
        {marks.map((mark, index) => (
          <span
            key={`${mark.timestamp}-${index}`}
            aria-hidden="true"
            className={`rise absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface ${
              mark.wentBack ? 'bg-accent' : 'bg-pause'
            }`}
            style={{ left: `${position(mark.timestamp)}%`, animationDelay: `${0.2 + index * 0.05}s` }}
          />
        ))}
        <span
          aria-hidden="true"
          className="absolute bottom-0 top-0 w-px bg-ink/60"
          style={{ left: `${position(now.getTime())}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-caption text-faint" aria-hidden="true">
        <span>{startHour}</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
      <p className="mt-3 text-caption text-muted">{t('start.brakes.caption')}</p>
    </div>
  );
}
