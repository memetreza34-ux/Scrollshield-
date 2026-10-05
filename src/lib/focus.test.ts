import { describe, expect, it } from 'vitest';
import { AppState, DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { createFocusEndUpdate, createFocusStartUpdate, reconcileFocusRuntime } from './focus';

const makeState = (overrides: Partial<AppState> = {}): AppState => ({
  ...DEFAULT_STATE,
  appsConfig: {
    instagram: { id: 'instagram', ...DEFAULT_APP_CONFIG, active: true },
    tiktok: { id: 'tiktok', ...DEFAULT_APP_CONFIG, active: false },
  },
  ...overrides,
});

describe('createFocusStartUpdate', () => {
  it('starts focus mode and records protected apps', () => {
    const update = createFocusStartUpdate(makeState(), 25, 1_000);

    expect(update.isFocusModeActive).toBe(true);
    expect(update.focusTimeRemaining).toBe(25);
    expect(update.focusSessions?.[0].duration).toBe(25);
    expect(update.focusSessions?.[0].protectedApps).toEqual(['instagram']);
    expect(update.history?.[0].type).toBe('focus_start');
  });
});

describe('createFocusEndUpdate', () => {
  it('credits the full focus duration for successful sessions', () => {
    const state = makeState({
      isFocusModeActive: true,
      focusTimeRemaining: 0,
      focusSessions: [
        {
          id: 'focus-1',
          startTime: 1_000,
          endTime: null,
          duration: 25,
          successful: false,
          protectedApps: ['instagram'],
          blocksTriggered: 0,
        },
      ],
    });

    const update = createFocusEndUpdate(state, true, 1_000 + 25 * 60_000);

    expect(update.isFocusModeActive).toBe(false);
    expect(update.focusSessions?.[0].successful).toBe(true);
    expect(update.pendingFocusResultId).toBe('focus-1');
    expect(update.dailyStats?.['1970-01-01'].focusMinutes).toBe(25);
    expect(update.history?.[0].desc).toBe('Fokus-Sitzung erfolgreich beendet.');
  });

  it('credits only elapsed focus minutes for aborted sessions', () => {
    const state = makeState({
      isFocusModeActive: true,
      focusTimeRemaining: 15,
      focusSessions: [
        {
          id: 'focus-1',
          startTime: 1_000,
          endTime: null,
          duration: 25,
          successful: false,
          protectedApps: ['instagram'],
          blocksTriggered: 0,
        },
      ],
    });

    const update = createFocusEndUpdate(state, false, 1_000 + 10 * 60_000);

    expect(update.focusSessions?.[0].successful).toBe(false);
    expect(update.pendingFocusResultId).toBe('focus-1');
    expect(update.dailyStats?.['1970-01-01'].focusMinutes).toBe(10);
    expect(update.history?.[0].desc).toBe('Fokus-Sitzung vorzeitig abgebrochen.');
  });
});

describe('reconcileFocusRuntime', () => {
  it('restores the remaining time from the persisted start timestamp', () => {
    const state = makeState({
      isFocusModeActive: true,
      focusTimeRemaining: 25,
      focusSessions: [
        {
          id: 'focus-1',
          startTime: 1_000,
          endTime: null,
          duration: 25,
          successful: false,
          protectedApps: ['instagram'],
          blocksTriggered: 0,
        },
      ],
    });

    expect(reconcileFocusRuntime(state, 1_000 + 10 * 60_000)).toEqual({
      isFocusModeActive: true,
      focusTimeRemaining: 15,
    });
  });

  it('finishes an expired session exactly at its scheduled end', () => {
    const state = makeState({
      isFocusModeActive: true,
      focusTimeRemaining: 25,
      focusSessions: [
        {
          id: 'focus-1',
          startTime: 1_000,
          endTime: null,
          duration: 25,
          successful: false,
          protectedApps: ['instagram'],
          blocksTriggered: 0,
        },
      ],
    });

    const update = reconcileFocusRuntime(state, 1_000 + 40 * 60_000);

    expect(update?.isFocusModeActive).toBe(false);
    expect(update?.focusTimeRemaining).toBe(0);
    expect(update?.focusSessions?.[0]).toMatchObject({
      endTime: 1_000 + 25 * 60_000,
      successful: true,
    });
    expect(update?.dailyStats?.['1970-01-01'].focusMinutes).toBe(25);
  });

  it('repairs an active flag when no open focus session exists', () => {
    expect(
      reconcileFocusRuntime(makeState({ isFocusModeActive: true, focusTimeRemaining: 5, focusSessions: [] }), 1_000),
    ).toEqual({ isFocusModeActive: false, focusTimeRemaining: 0 });
  });
});
