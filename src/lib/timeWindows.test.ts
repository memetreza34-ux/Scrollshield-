import { describe, expect, it } from 'vitest';
import { getActiveTimeWindowRule, getTimeWindow } from './timeWindows';
import { AppConfig } from '../types';

const at = (isoLocal: string) => new Date(isoLocal);

const windows = (overrides: Partial<AppConfig['timeWindows']> = {}): AppConfig['timeWindows'] => ({
  enabled: true,
  morningRules: 'normal',
  workRules: 'normal',
  eveningRules: 'normal',
  nightRules: 'normal',
  weekendRules: 'normal',
  ...overrides,
});

describe('getTimeWindow', () => {
  it('maps hours to the documented windows', () => {
    // 2026-09-02 is a Wednesday.
    expect(getTimeWindow(at('2026-09-02T07:00'))).toBe('morning');
    expect(getTimeWindow(at('2026-09-02T12:00'))).toBe('work');
    expect(getTimeWindow(at('2026-09-02T19:30'))).toBe('evening');
    expect(getTimeWindow(at('2026-09-02T23:00'))).toBe('night');
  });

  it('treats the night window as wrapping past midnight', () => {
    expect(getTimeWindow(at('2026-09-02T02:00'))).toBe('night');
    expect(getTimeWindow(at('2026-09-02T05:59'))).toBe('night');
    expect(getTimeWindow(at('2026-09-02T06:00'))).toBe('morning');
  });

  it('uses exclusive upper bounds', () => {
    expect(getTimeWindow(at('2026-09-02T08:59'))).toBe('morning');
    expect(getTimeWindow(at('2026-09-02T09:00'))).toBe('work');
    expect(getTimeWindow(at('2026-09-02T17:59'))).toBe('work');
    expect(getTimeWindow(at('2026-09-02T18:00'))).toBe('evening');
  });
});

describe('getActiveTimeWindowRule', () => {
  it('returns the rule of the current window', () => {
    const result = getActiveTimeWindowRule(windows({ workRules: 'strict' }), at('2026-09-02T10:00'));

    expect(result).toEqual({ window: 'work', rule: 'strict' });
  });

  it('defaults to normal without configuration', () => {
    expect(getActiveTimeWindowRule(undefined, at('2026-09-02T10:00')).rule).toBe('normal');
  });

  it('stays inactive until the user opts in', () => {
    // Stored configs carry workRules: 'strict' from before the feature was
    // evaluated; enabling it silently would lock people out on update.
    const stored = windows({ enabled: false, workRules: 'block' });

    expect(getActiveTimeWindowRule(stored, at('2026-09-02T10:00')).rule).toBe('normal');
  });

  it('lets a stricter weekend rule win', () => {
    // 2026-09-05 is a Saturday.
    const result = getActiveTimeWindowRule(
      windows({ workRules: 'normal', weekendRules: 'block' }),
      at('2026-09-05T10:00'),
    );

    expect(result).toEqual({ window: 'weekend', rule: 'block' });
  });

  it('does not let a lax weekend rule weaken a night block', () => {
    const result = getActiveTimeWindowRule(
      windows({ nightRules: 'block', weekendRules: 'normal' }),
      at('2026-09-05T23:00'),
    );

    expect(result.rule).toBe('block');
  });

  it('ignores the weekend rule on weekdays', () => {
    const result = getActiveTimeWindowRule(
      windows({ workRules: 'normal', weekendRules: 'block' }),
      at('2026-09-02T10:00'),
    );

    expect(result).toEqual({ window: 'work', rule: 'normal' });
  });

  it('applies the weekend rule on Sunday too', () => {
    // 2026-09-06 is a Sunday.
    expect(getActiveTimeWindowRule(windows({ weekendRules: 'strict' }), at('2026-09-06T14:00')).rule).toBe('strict');
  });
});
