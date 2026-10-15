import { t } from '../i18n';
import type { AppState } from '../types';

/**
 * Self-commitment (Pro): until the chosen time, protection can only get
 * stricter. Apps cannot be switched off, presets cannot get looser, schedules
 * cannot be paused or deleted, and there is no emergency unlock.
 */
export const isCommitmentActive = (state: Pick<AppState, 'commitment'>, now = Date.now()) =>
  state.commitment !== null && state.commitment !== undefined && state.commitment.until > now;

/** "15:30" – 24-hour clock in both languages. */
export const formatClock = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

/** "heute 22:00" or "morgen 07:00". */
export const formatUntil = (timestamp: number, now = Date.now()) => {
  const today = new Date(now).toDateString();
  const day = t(new Date(timestamp).toDateString() === today ? 'time.today' : 'time.tomorrow');
  return `${day} ${formatClock(timestamp)}`;
};
