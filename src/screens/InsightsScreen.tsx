import { useState } from 'react';
import { CalendarDays, ChartNoAxesColumn, RotateCcw, SquarePlay, TriangleAlert, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppState, Screen, SUPPORTED_APPS } from '../types';
import {
  AppTile,
  Choice,
  InlineButton,
  List,
  Notice,
  Page,
  SecondaryButton,
  Section,
  TabHeader,
} from '../components/ui';
import { getLanguage, MessageKey, t } from '../i18n';
import { DayMetrics, eventsOnDay, getDayMetrics, getReopenHours, getWeekMetrics } from '../lib/metrics';
import { hasPro, paywallFor } from '../lib/entitlements';
import { formatClock } from '../lib/commitment';
import { formatMinutes } from '../lib/format';
import { describeEvent, isListedEvent } from '../lib/eventText';

type ScreenProps = {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
};

const CARD = 'rounded-surface border border-line bg-surface';
const locale = () => (getLanguage() === 'de' ? 'de-DE' : 'en-GB');
/** "Mo", "Di" – without the dot German short weekdays carry. */
const weekday = (date: Date) => date.toLocaleDateString(locale(), { weekday: 'short' }).replace(/\.$/, '');

/** A labelled bar for a share of the largest value; neutral, because a share is not a signal. */
function Bar({ share }: { share: number }) {
  return (
    <span aria-hidden="true" className="mt-2 block h-1.5 rounded-full bg-line">
      <span className="block h-full rounded-full bg-muted" style={{ width: `${Math.round(share * 100)}%` }} />
    </span>
  );
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className={`flex flex-col gap-1 px-4 py-3 ${CARD}`}>
      <span className="text-title text-ink">{value}</span>
      <span className="text-body-s text-muted">{label}</span>
    </div>
  );
}

function TodayView({ state, navigate }: { state: AppState; navigate: ScreenProps['navigate'] }) {
  const now = new Date(Date.now());
  const metrics = getDayMetrics(state, now);
  const events = eventsOnDay(state.history, now)
    .filter(isListedEvent)
    .sort((a, b) => b.timestamp - a.timestamp);
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);
  const feedApps = protectedApps.filter((app) => app.shortVideoSurface);
  const isWeb = state.operatingSystem === 'web';
  const usageMeasured = !isWeb && state.permissions.usageAccess;
  const feedMeasured = !isWeb && state.permissions.accessibility;
  const attempts = metrics.interruptions + metrics.opens;
  const date = now.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });

  const perApp = (appId: string) => metrics.perApp.find((entry) => entry.appId === appId);
  const maxUsage = Math.max(1, ...protectedApps.map((app) => perApp(app.id)?.usageMinutes ?? 0));

  const tiles: [number | string, MessageKey][] = [
    [attempts, 'insights.tile.attempts'],
    [metrics.interruptions, 'insights.tile.interruptions'],
    [metrics.abandoned, 'insights.tile.back'],
    [metrics.reopens, 'insights.tile.reopens'],
    [formatMinutes(metrics.focusMinutes), 'insights.tile.focus'],
    [metrics.emergencyUnlocks, 'insights.tile.emergency'],
  ];

  return (
    <>
      <p className="mb-4 text-body-s text-muted">
        {attempts === 0 ? date : t('insights.dateUntil', { date, time: formatClock(now.getTime()) })}
      </p>

      {attempts === 0 && events.length === 0 ? (
        <div className={`mb-6 flex items-start gap-3 p-4 ${CARD}`}>
          <CalendarDays size={24} strokeWidth={1.75} className="flex-shrink-0 text-muted" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <p className="text-title-s text-ink">{t('today.empty.title')}</p>
            <p className="text-body-s text-muted">{t('insights.emptyText')}</p>
          </div>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3">
          {tiles.map(([value, label]) => (
            <Tile key={label} value={value} label={t(label)} />
          ))}
        </div>
      )}

      {protectedApps.length > 0 && (
        <Section title={t('insights.usage')} kind="title">
          <List>
            {protectedApps.map((app) => {
              const minutes = perApp(app.id)?.usageMinutes;
              return (
                <div key={app.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <AppTile app={app} size="sm" />
                    <span className="flex-1 text-body text-ink">{app.name}</span>
                    <span className="text-body-s text-muted">
                      {usageMeasured && minutes !== null && minutes !== undefined
                        ? formatMinutes(minutes)
                        : t('today.opens.notMeasured')}
                    </span>
                  </div>
                  {usageMeasured && minutes ? <Bar share={minutes / maxUsage} /> : null}
                </div>
              );
            })}
          </List>
          {usageMeasured && <p className="mt-2 px-4 text-caption text-muted">{t('insights.usageSource')}</p>}
        </Section>
      )}

      {feedApps.length > 0 && (
        <Section title={t('insights.shortVideo')} kind="title">
          {!isWeb && !feedMeasured && (
            <div className="mb-3">
              <Notice
                icon={TriangleAlert}
                tone="pause"
                action={<InlineButton onClick={() => navigate('permissions')}>{t('common.turnOn')}</InlineButton>}
              >
                {t('insights.shortVideoOff')}
              </Notice>
            </div>
          )}
          <List>
            {feedApps.map((app) => {
              const minutes = perApp(app.id)?.shortVideoMinutes;
              const feed = state.appsConfig[app.id]?.reelsProtection;
              const limit = feed?.enabled && feed.mode === 'limit' ? feed.dailyLimitMinutes : 0;
              const measured = feedMeasured && minutes !== null && minutes !== undefined;
              return (
                <div key={app.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-body text-ink">{app.shortVideoSurface?.name}</span>
                    <span className="text-body-s text-muted">
                      {!measured
                        ? t('today.opens.notMeasured')
                        : limit > 0
                          ? t('insights.ofLimit', { time: formatMinutes(minutes), limit })
                          : formatMinutes(minutes)}
                    </span>
                  </div>
                  {measured && limit > 0 && <Bar share={Math.min(1, minutes / limit)} />}
                </div>
              );
            })}
          </List>
          {feedMeasured && <p className="mt-2 px-4 text-caption text-muted">{t('insights.shortVideoSource')}</p>}
        </Section>
      )}

      {events.length > 0 && (
        <Section title={t('insights.events')} kind="title">
          <List>
            {events.slice(0, 50).map((event) => {
              const app = SUPPORTED_APPS.find((candidate) => candidate.id === event.appId);
              const who = app?.name ?? (event.type.startsWith('focus') ? t('nav.focus') : '');
              return (
                <div key={event.id} className="flex items-start gap-4 px-4 py-3">
                  <span className="w-11 flex-shrink-0 text-body-s text-muted">{formatClock(event.timestamp)}</span>
                  <span className="min-w-0 flex-1">
                    {who && <span className="block text-body font-semibold text-ink">{who}</span>}
                    <span className="block text-body-s text-muted">{describeEvent(event)}</span>
                  </span>
                </div>
              );
            })}
          </List>
        </Section>
      )}
    </>
  );
}

type WeekKey = 'attempts' | 'interruptions' | 'abandoned' | 'reopens' | 'focusMinutes';
const weekValue = (day: DayMetrics, key: WeekKey) => (key === 'attempts' ? day.interruptions + day.opens : day[key]);

function WeekView({ state }: { state: AppState }) {
  const week = getWeekMetrics(state);
  const previous = getWeekMetrics(state, new Date(Date.now() - 7 * 24 * 60 * 60_000));
  const sum = (days: typeof week, key: WeekKey) => days.reduce((total, day) => total + weekValue(day.metrics, key), 0);
  const maxDay = Math.max(1, ...week.map((day) => day.metrics.interruptions));
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);
  const range = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long' }).formatRange(
    week[0].date,
    week[6].date,
  );

  // Reopens in three-hour blocks over the last 14 days.
  const hours = getReopenHours(state.history);
  const blocks = Array.from({ length: 8 }, (_, index) => ({
    from: index * 3,
    count: hours.slice(index * 3, index * 3 + 3).reduce((total, count) => total + count, 0),
  }));
  const maxBlock = Math.max(1, ...blocks.map((block) => block.count));
  const peak = blocks.reduce((best, block) => (block.count > best.count ? block : best), blocks[0]);

  const interruptions = sum(week, 'interruptions');
  const interruptionDelta = interruptions - sum(previous, 'interruptions');
  const deltaText = (delta: number, format: (value: number) => string = String) =>
    delta === 0 ? '±0' : `${delta > 0 ? '+' : '−'}${format(Math.abs(delta))}`;

  const compare: [WeekKey, MessageKey][] = [
    ['attempts', 'insights.tile.attempts'],
    ['interruptions', 'insights.tile.interruptions'],
    ['abandoned', 'insights.tile.back'],
    ['reopens', 'insights.tile.reopens'],
    ['focusMinutes', 'insights.tile.focus'],
  ];

  const appWeek = (days: typeof week, appId: string, field: 'usageMinutes' | 'shortVideoMinutes') =>
    days.reduce((total, day) => total + (day.metrics.perApp.find((entry) => entry.appId === appId)?.[field] ?? 0), 0);

  return (
    <>
      <p className="mb-4 text-body-s text-muted">{t('insights.week.range', { range })}</p>

      <div className={`mb-6 flex flex-col gap-1 p-4 ${CARD}`}>
        <span className="text-body text-ink">{t('insights.tile.interruptions')}</span>
        <span className="text-number text-ink">{interruptions}</span>
        <span className="text-body-s text-muted">
          {interruptionDelta === 0
            ? t('insights.week.same')
            : t(interruptionDelta < 0 ? 'insights.week.fewer' : 'insights.week.more', {
                count: Math.abs(interruptionDelta),
              })}
        </span>
        <div role="img" aria-label={t('insights.week.chart')} className="mt-4 grid h-32 grid-cols-7 items-end gap-2">
          {week.map(({ date, metrics }) => (
            <div key={date.toISOString()} className="flex h-full flex-col items-center justify-end gap-1">
              <span className="text-caption text-muted">{metrics.interruptions}</span>
              <span
                className="w-full rounded-t-sm bg-muted"
                style={{ height: `${Math.max(2, (metrics.interruptions / maxDay) * 72)}px` }}
              />
              <span className="text-caption text-muted">{weekday(date)}</span>
            </div>
          ))}
        </div>
      </div>

      <Section title={t('insights.week.compare')} kind="title">
        <List>
          {compare.map(([key, label]) => {
            const now = sum(week, key);
            const delta = now - sum(previous, key);
            const format = key === 'focusMinutes' ? formatMinutes : String;
            return (
              <div key={key} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 text-body text-ink">{t(label)}</span>
                <span className="text-body font-semibold text-ink">{format(now)}</span>
                <span className="w-20 text-right text-body-s text-muted">{deltaText(delta, format)}</span>
              </div>
            );
          })}
        </List>
      </Section>

      <Section title={t('insights.week.pattern')} kind="title">
        <div className={`p-4 ${CARD}`}>
          {peak.count > 0 ? (
            <>
              <p className="mb-3 text-body-s text-ink">
                {t('insights.week.peak', { from: peak.from, to: peak.from + 3 })}
              </p>
              <ul className="flex flex-col gap-2">
                {blocks.map((block) => (
                  <li key={block.from} className="grid grid-cols-[56px_minmax(0,1fr)_24px] items-center gap-3">
                    <span className="text-caption text-muted">
                      {`${String(block.from).padStart(2, '0')}–${String(block.from + 3).padStart(2, '0')}`}
                    </span>
                    <span aria-hidden="true" className="block h-1.5 rounded-full bg-line">
                      <span
                        className="block h-full rounded-full bg-muted"
                        style={{ width: `${(block.count / maxBlock) * 100}%` }}
                      />
                    </span>
                    <span className="text-right text-caption text-muted">{block.count}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-body-s text-muted">{t('insights.week.noPattern')}</p>
          )}
        </div>
      </Section>

      <Section title={t('insights.week.trends')} kind="title">
        <List>
          {protectedApps.map((app) => {
            const usage = appWeek(week, app.id, 'usageMinutes');
            const usageDelta = usage - appWeek(previous, app.id, 'usageMinutes');
            const feed = appWeek(week, app.id, 'shortVideoMinutes');
            return (
              <div key={app.id} className="flex items-start gap-4 px-4 py-3">
                <AppTile app={app} />
                <span className="min-w-0 flex-1">
                  <span className="block text-title-s text-ink">{app.name}</span>
                  <span className="block text-body-s text-muted">
                    {t('insights.week.usage', {
                      time: formatMinutes(usage),
                      delta: deltaText(usageDelta, formatMinutes),
                    })}
                  </span>
                  {app.shortVideoSurface && feed > 0 && (
                    <span className="block text-body-s text-muted">
                      {`${app.shortVideoSurface.name.split(' ').at(-1)} ${formatMinutes(feed)}`}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </List>
      </Section>
    </>
  );
}

const PRO_POINTS: { icon: LucideIcon; title: MessageKey; text: MessageKey }[] = [
  { icon: ChartNoAxesColumn, title: 'insights.preview.week', text: 'insights.preview.weekText' },
  { icon: RotateCcw, title: 'insights.week.pattern', text: 'insights.preview.patternText' },
  { icon: TrendingDown, title: 'insights.week.trends', text: 'insights.preview.trendsText' },
];

/** Woche for free users: a calm preview with placeholders, no numbers, no countdown. */
function WeekPreview({ onShowPro }: { onShowPro: () => void }) {
  const placeholders = [40, 64, 52, 80, 36, 56, 44];
  const today = new Date(Date.now());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  return (
    <>
      <div className={`mb-6 p-4 ${CARD}`}>
        <div aria-hidden="true" className="grid h-28 grid-cols-7 items-end gap-2">
          {placeholders.map((height, index) => (
            <div key={index} className="flex h-full flex-col items-center justify-end gap-1">
              <span className="w-full rounded-t-sm bg-line" style={{ height }} />
              <span className="text-caption text-muted">{weekday(days[index])}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-caption text-muted">{t('insights.preview.placeholder')}</p>
      </div>

      <Section title={t('insights.preview.title')} kind="title">
        <div className={`flex flex-col gap-4 p-4 ${CARD}`}>
          {PRO_POINTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon size={20} strokeWidth={1.75} className="mt-0.5 flex-shrink-0 text-muted" aria-hidden="true" />
              <span className="flex flex-col gap-0.5">
                <span className="text-body font-semibold text-ink">{t(title)}</span>
                <span className="text-body-s text-muted">{t(text)}</span>
              </span>
            </div>
          ))}
          <SecondaryButton onClick={onShowPro}>{t('insights.preview.action')}</SecondaryButton>
        </div>
      </Section>
      <p className="px-4 text-center text-caption text-muted">{t('insights.preview.todayFree')}</p>
    </>
  );
}

/** Einblicke (docs/V1_MASTER_PLAN.md, 4.5): only numbers with a real source. */
export function InsightsScreen({ state, updateState, navigate }: ScreenProps) {
  const [view, setView] = useState<'today' | 'week'>('today');
  const pro = hasPro(state);

  return (
    <Page>
      <TabHeader title={t('nav.insights')} navigate={navigate} />
      <div className="mb-4">
        <Choice<'today' | 'week'>
          label={t('insights.range')}
          value={view}
          onChange={setView}
          options={[
            { value: 'today', label: t('nav.today') },
            { value: 'week', label: t('insights.week'), pro: !pro },
          ]}
        />
      </div>
      {view === 'today' ? (
        <TodayView state={state} navigate={navigate} />
      ) : pro ? (
        <WeekView state={state} />
      ) : (
        <WeekPreview
          onShowPro={() => {
            updateState(paywallFor('insights_week'));
            navigate('paywall');
          }}
        />
      )}
    </Page>
  );
}
