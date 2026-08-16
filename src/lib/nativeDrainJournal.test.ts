import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from '../types';
import { normalizeAppState } from './state';
import {
  applyNativeDrainBatch,
  getLastProcessedNativeDrainBatchId,
  hasProcessedNativeDrainBatch,
  normalizeNativeDrainBatchId,
} from './nativeDrainJournal';

const BATCH_A = '11111111-1111-4111-8111-111111111111';
const BATCH_B = '22222222-2222-4222-8222-222222222222';

const createState = () => normalizeAppState(DEFAULT_STATE);

describe('native drain journal', () => {
  it('applies usage and events exactly once for the same persistent batch id', () => {
    const drain = {
      batchId: BATCH_A,
      usage: [{ date: '2026-08-16', appId: 'instagram', durationMs: 60_000 }],
      events: [
        {
          timestamp: 1_786_000_000_000,
          type: 'block' as const,
          appId: 'instagram',
          desc: 'Instagram wurde blockiert',
        },
      ],
    };

    const first = applyNativeDrainBatch(createState(), drain);
    const replay = applyNativeDrainBatch(first, drain);

    expect(first.dailyStats['2026-08-16']?.usageMinutes.instagram).toBe(1);
    expect(first.dailyStats['2026-08-16']?.blockedOpens).toBe(1);
    expect(first.history).toHaveLength(1);
    expect(first.history[0]?.metadata?.nativeDrainBatchId).toBe(BATCH_A);
    expect(getLastProcessedNativeDrainBatchId(first)).toBe(BATCH_A);
    expect(replay).toBe(first);
  });

  it('accepts a later different batch and advances the journal', () => {
    const first = applyNativeDrainBatch(createState(), {
      batchId: BATCH_A,
      events: [],
      usage: [{ date: '2026-08-16', appId: 'instagram', durationMs: 30_000 }],
    });
    const second = applyNativeDrainBatch(first, {
      batchId: BATCH_B,
      events: [],
      usage: [{ date: '2026-08-16', appId: 'instagram', durationMs: 30_000 }],
    });

    expect(second.dailyStats['2026-08-16']?.usageMinutes.instagram).toBe(1);
    expect(getLastProcessedNativeDrainBatchId(second)).toBe(BATCH_B);
  });

  it('keeps the processed id through normal state normalization and settings persistence shape', () => {
    const applied = applyNativeDrainBatch(createState(), {
      batchId: BATCH_A,
      events: [],
      usage: [{ date: '2026-08-16', appId: 'youtube', durationMs: 60_000 }],
    });

    const restored = normalizeAppState(JSON.parse(JSON.stringify(applied)));

    expect(getLastProcessedNativeDrainBatchId(restored)).toBe(BATCH_A);
    expect(hasProcessedNativeDrainBatch(restored, BATCH_A)).toBe(true);
    expect(applyNativeDrainBatch(restored, { batchId: BATCH_A, events: [], usage: [] })).toBe(restored);
  });

  it('rejects malformed batch identifiers without mutating app state', () => {
    const state = createState();
    const result = applyNativeDrainBatch(state, {
      batchId: 'not-a-safe-batch-id',
      events: [
        {
          timestamp: 1,
          type: 'warning',
          appId: 'system',
          desc: 'Should not be imported',
        },
      ],
      usage: [],
    });

    expect(result).toBe(state);
    expect(normalizeNativeDrainBatchId('not-a-safe-batch-id')).toBeNull();
  });
});
