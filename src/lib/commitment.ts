import type { AppState } from '../types';

/**
 * Self-commitment (Pro): until the chosen time, protection can only get
 * stricter. Apps cannot be switched off, presets cannot get looser, schedules
 * cannot be paused or deleted, and there is no emergency unlock.
 */
export const isCommitmentActive = (state: Pick<AppState, 'commitment'>, now = Date.now()) =>
  state.commitment !== null && state.commitment !== undefined && state.commitment.until > now;

export const formatClock = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

/** "heute 22:00" or "morgen 07:00". */
export const formatUntil = (timestamp: number, now = Date.now()) => {
  const today = new Date(now).toDateString();
  const day = new Date(timestamp).toDateString() === today ? 'heute' : 'morgen';
  return `${day} ${formatClock(timestamp)}`;
};
