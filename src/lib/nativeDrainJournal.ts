import type { AppState, HistoryEvent } from '../types';
import { createEventId } from './appUtils';
import type { NativeProtectionDrain } from './nativeProtection';
import { recordProtectionEventStats } from './session';

const JOURNAL_KEY = '__scrollshieldNativeDrain';
const BATCH_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SettingsWithNativeDrainJournal = AppState['settings'] & {
  [JOURNAL_KEY]?: {
    lastProcessedBatchId?: unknown;
  };
};

const getJournal = (state: AppState): SettingsWithNativeDrainJournal[typeof JOURNAL_KEY] =>
  (state.settings as SettingsWithNativeDrainJournal)[JOURNAL_KEY];

export const normalizeNativeDrainBatchId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return BATCH_ID_PATTERN.test(normalized) ? normalized.toLowerCase() : null;
};

export const getLastProcessedNativeDrainBatchId = (state: AppState): string | null =>
  normalizeNativeDrainBatchId(getJournal(state)?.lastProcessedBatchId);

export const hasProcessedNativeDrainBatch = (state: AppState, batchId: string): boolean => {
  const normalizedBatchId = normalizeNativeDrainBatchId(batchId);
  return normalizedBatchId !== null && getLastProcessedNativeDrainBatchId(state) === normalizedBatchId;
};

/**
 * Applies one native drain batch exactly once in React state.
 *
 * The processed batch id is written inside state.settings. StorageService already saves the whole
 * settings chunk in the same staged/verified transaction as stats and history, so replay after a
 * crash can distinguish "persisted before ACK" from "not persisted yet" without a second journal.
 */
export const applyNativeDrainBatch = (state: AppState, drain: NativeProtectionDrain): AppState => {
  const batchId = normalizeNativeDrainBatchId(drain.batchId);
  if (!batchId || hasProcessedNativeDrainBatch(state, batchId)) return state;

  let dailyStats = state.dailyStats;
  for (const sample of drain.usage) {
    const existing = dailyStats[sample.date] || {
      date: sample.date,
      usageMinutes: {},
      blockedOpens: 0,
      savedTimeMinutes: 0,
      emergencyUnlocks: 0,
      focusMinutes: 0,
    };
    dailyStats = {
      ...dailyStats,
      [sample.date]: {
        ...existing,
        usageMinutes: {
          ...existing.usageMinutes,
          [sample.appId]: (existing.usageMinutes[sample.appId] || 0) + sample.durationMs / 60_000,
        },
      },
    };
  }

  const historyEvents: HistoryEvent[] = drain.events.map((event) => {
    dailyStats = recordProtectionEventStats(dailyStats, event.type, event.timestamp);
    return {
      id: createEventId(),
      timestamp: event.timestamp,
      type: event.type,
      appId: event.appId,
      desc: event.desc,
      trigger: 'Android-Systemschutz',
      metadata: { source: 'native_android', nativeDrainBatchId: batchId },
    };
  });

  const settings: SettingsWithNativeDrainJournal = {
    ...state.settings,
    [JOURNAL_KEY]: {
      lastProcessedBatchId: batchId,
    },
  };

  return {
    ...state,
    settings,
    history: [...historyEvents.reverse(), ...state.history].slice(0, 1_000),
    dailyStats,
  };
};
