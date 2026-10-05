import { describe, expect, it } from 'vitest';
import { AppState, DEFAULT_STATE } from '../types';
import { getCurrentScheduleWindow, reconcileFocusSchedules } from './focusSchedule';

const withWorkSchedule = (overrides: Partial<AppState> = {}): AppState => ({
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  focusSchedules: [{ ...DEFAULT_STATE.focusSchedules[0], active: true }],
  ...overrides,
});

describe('focus schedules', () => {
  it('starts an enabled schedule for the remaining time and only once per day', () => {
    const monday = new Date(2026, 9, 5, 9, 15).getTime();
    const state = withWorkSchedule();
    const update = reconcileFocusSchedules(state, monday);

    expect(update?.isFocusModeActive).toBe(true);
    expect(update?.focusSessions?.[0]).toMatchObject({ startTime: monday, duration: 165 });
    expect(update?.focusSchedules?.[0].lastStartedOn).toBe('2026-10-05');
    expect(reconcileFocusSchedules({ ...state, ...update }, monday + 60_000)).toBeNull();
  });

  it('continues an overnight schedule after midnight without starting twice', () => {
    const evening = { ...DEFAULT_STATE.focusSchedules[1], active: true };
    const afterMidnight = new Date(2026, 9, 6, 0, 30).getTime();
    const window = getCurrentScheduleWindow(evening, afterMidnight);
    const update = reconcileFocusSchedules(withWorkSchedule({ focusSchedules: [evening] }), afterMidnight);

    expect(window?.key).toBe('2026-10-05');
    expect(update?.focusSessions?.[0].duration).toBe(390);
    expect(update?.focusSchedules?.[0].lastStartedOn).toBe('2026-10-05');
  });

  it('does not interrupt a manual session or restart after it ends', () => {
    const monday = new Date(2026, 9, 5, 9, 0).getTime();
    const state = withWorkSchedule({
      isFocusModeActive: true,
      focusSessions: [
        {
          id: 'manual',
          startTime: monday - 60_000,
          endTime: null,
          duration: 25,
          successful: false,
          protectedApps: [],
          blocksTriggered: 0,
        },
      ],
    });

    const update = reconcileFocusSchedules(state, monday);
    expect(update).toEqual({ focusSchedules: [{ ...state.focusSchedules[0], lastStartedOn: '2026-10-05' }] });
    expect(
      reconcileFocusSchedules({ ...state, ...update, isFocusModeActive: false, focusSessions: [] }, monday + 30_000),
    ).toBeNull();
  });
});
