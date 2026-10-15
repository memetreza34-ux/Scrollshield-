import { MessageKey, t } from '../i18n';
import type { HistoryEvent } from '../types';

const LOCK_REASONS: Record<string, MessageKey> = {
  TIME_WINDOW: 'event.reason.schedule',
  DAILY_LIMIT: 'event.reason.budget',
  ANTI_BINGE: 'event.reason.cooldown',
  FOCUS: 'event.reason.focus',
  STRICT: 'event.reason.strict',
};

const BY_TYPE: Partial<Record<HistoryEvent['type'], MessageKey>> = {
  open: 'event.opened',
  block: 'event.blockedPlain',
  warning: 'event.interrupted',
  emergency: 'event.emergency',
  focus_start: 'event.focusStart',
  focus_end: 'event.focusEnd',
  session_end: 'event.sessionEnd',
};

/** Whether an event belongs in the day's list on Einblicke. */
export const isListedEvent = (event: HistoryEvent) => event.type in BY_TYPE;

/**
 * What happened, in the current language. The stored `desc` was written in
 * German when the event came in; the text is rebuilt from type and metadata
 * instead, so the list follows the language setting.
 */
export function describeEvent(event: HistoryEvent): string {
  const metadata = event.metadata ?? {};
  const reason = typeof metadata.reason === 'string' ? metadata.reason : '';

  if (metadata.source === 'android') {
    if (event.trigger === 'reels_protection') {
      if (reason === 'SWIPES') return t('event.feed.swipes', { count: Number(metadata.singleItemsViewed ?? 0) });
      if (reason === 'SESSION_LIMIT') return t('event.feed.session');
      if (reason === 'DAILY_LIMIT') return t('event.feed.daily');
      return t('event.feed.blocked');
    }
    const outcome = metadata.outcome;
    if (outcome === 'warned' && reason === 'ANTI_BINGE_WARNING') return t('event.reopenLonger');
    if (outcome === 'warned' && reason === 'SESSION_LIMIT') return t('event.sessionGuard');
    if (outcome === 'blocked') return t('event.blocked', { reason: t(LOCK_REASONS[reason] ?? LOCK_REASONS.STRICT) });
    if (outcome === 'stopped') return t('event.stopped');
    if (outcome === 'continued') return t('event.continued');
  }

  const key = BY_TYPE[event.type];
  return key ? t(key) : event.desc;
}
