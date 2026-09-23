import { describe, expect, it } from 'vitest';
import { AppConfig, DEFAULT_APP_CONFIG, HistoryEvent } from '../types';
import { countEmergencyUnlocksToday, evaluateProtectionAttempt, getAppUsageMinutesToday } from './protectionRules';

type ConfigOverrides = Partial<Omit<AppConfig, 'reelsProtection' | 'emergencyUnlock' | 'timeWindows' | 'antiBinge'>> & {
  reelsProtection?: Partial<AppConfig['reelsProtection']>;
  emergencyUnlock?: Partial<AppConfig['emergencyUnlock']>;
  timeWindows?: Partial<AppConfig['timeWindows']>;
  antiBinge?: Partial<AppConfig['antiBinge']>;
};

const makeConfig = (overrides: ConfigOverrides = {}): AppConfig => ({
  id: 'instagram',
  ...DEFAULT_APP_CONFIG,
  active: true,
  ...overrides,
  reelsProtection: {
    ...DEFAULT_APP_CONFIG.reelsProtection,
    ...overrides.reelsProtection,
  },
  emergencyUnlock: {
    ...DEFAULT_APP_CONFIG.emergencyUnlock,
    ...overrides.emergencyUnlock,
  },
  timeWindows: {
    ...DEFAULT_APP_CONFIG.timeWindows,
    ...overrides.timeWindows,
  },
  antiBinge: {
    ...DEFAULT_APP_CONFIG.antiBinge,
    ...overrides.antiBinge,
  },
});

const now = new Date(2026, 5, 15, 12).getTime();

const openEvent = (minutesAgo: number): HistoryEvent => ({
  id: `open-${minutesAgo}`,
  timestamp: now - minutesAgo * 60_000,
  type: 'open',
  appId: 'instagram',
  desc: 'Opened',
});

describe('evaluateProtectionAttempt', () => {
  it('does not block inactive app protection configs', () => {
    expect(
      evaluateProtectionAttempt({
        appId: 'instagram',
        config: makeConfig({ active: false, mode: 'strict' }),
        history: [openEvent(1), openEvent(2), openEvent(3)],
        isFocusModeActive: true,
        now,
      }),
    ).toEqual({ step: 'app_opened' });
  });

  it('routes standard mode into a delay', () => {
    expect(
      evaluateProtectionAttempt({
        appId: 'instagram',
        config: makeConfig({ mode: 'standard', openDelay: 12, antiBinge: { enabled: false } }),
        history: [],
        isFocusModeActive: false,
        now,
      }),
    ).toEqual({ step: 'standard_delay', delaySeconds: 12 });
  });

  it('routes soft mode into intent check', () => {
    expect(
      evaluateProtectionAttempt({
        appId: 'instagram',
        config: makeConfig({ mode: 'soft', antiBinge: { enabled: false } }),
        history: [],
        isFocusModeActive: false,
        now,
      }).step,
    ).toBe('soft_intent');
  });

  it('blocks strict mode and logs the rule event', () => {
    const decision = evaluateProtectionAttempt({
      appId: 'instagram',
      config: makeConfig({ mode: 'strict', antiBinge: { enabled: false } }),
      history: [],
      isFocusModeActive: false,
      now,
    });

    expect(decision.step).toBe('strict_blocked');
    expect(decision.event?.type).toBe('block');
  });

  it('uses focus behavior to block during focus sessions', () => {
    expect(
      evaluateProtectionAttempt({
        appId: 'instagram',
        config: makeConfig({ mode: 'soft', focusModeBehavior: 'block', antiBinge: { enabled: false } }),
        history: [],
        isFocusModeActive: true,
        now,
      }).step,
    ).toBe('strict_blocked');
  });

  it('blocks when emergency unlocks are exhausted today', () => {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const decision = evaluateProtectionAttempt({
      appId: 'instagram',
      config: makeConfig({ mode: 'strict', emergencyUnlock: { maxPerDay: 1 }, antiBinge: { enabled: false } }),
      history: [
        {
          id: 'emergency-1',
          timestamp: dayStart.getTime() + 1_000,
          type: 'emergency',
          appId: 'instagram',
          desc: 'Emergency',
        },
      ],
      isFocusModeActive: false,
      now,
    });

    expect(decision.step).toBe('anti_binge_block');
    expect(decision.event?.desc).toBe('Zu viele Notfallfreigaben heute');
  });

  it('blocks when the app daily limit is already reached', () => {
    const decision = evaluateProtectionAttempt({
      appId: 'instagram',
      config: makeConfig({ dailyLimit: 20, mode: 'soft', antiBinge: { enabled: false } }),
      dailyStats: {
        '2026-06-15': {
          date: '2026-06-15',
          usageMinutes: { instagram: 20 },
          blockedOpens: 0,
          savedTimeMinutes: 0,
          emergencyUnlocks: 0,
          focusMinutes: 0,
        },
      },
      history: [],
      isFocusModeActive: false,
      now,
    });

    expect(decision.step).toBe('anti_binge_block');
    expect(decision.event?.desc).toBe('Tageslimit erreicht (20/20 Min)');
  });

  it('ignores disabled daily limits', () => {
    expect(
      evaluateProtectionAttempt({
        appId: 'instagram',
        config: makeConfig({ dailyLimit: 0, mode: 'soft', antiBinge: { enabled: false } }),
        dailyStats: {
          '2026-06-15': {
            date: '2026-06-15',
            usageMinutes: { instagram: 200 },
            blockedOpens: 0,
            savedTimeMinutes: 0,
            emergencyUnlocks: 0,
            focusMinutes: 0,
          },
        },
        history: [],
        isFocusModeActive: false,
        now,
      }).step,
    ).toBe('soft_intent');
  });

  it('prioritizes anti-binge block before ordinary strict logic', () => {
    const decision = evaluateProtectionAttempt({
      appId: 'instagram',
      config: makeConfig({
        mode: 'strict',
        antiBinge: {
          enabled: true,
          blockThreshold: 2,
          blockTimeframe: 20,
          warningThreshold: 1,
          warningTimeframe: 10,
        },
      }),
      history: [openEvent(1), openEvent(2)],
      isFocusModeActive: false,
      now,
    });

    expect(decision.step).toBe('anti_binge_block');
    expect(decision.event?.desc).toContain('Anti-Binge Sperre');
  });

  it('counts a session end as no extra opening', () => {
    const sessionEnd = (minutesAgo: number): HistoryEvent => ({
      ...openEvent(minutesAgo),
      id: `end-${minutesAgo}`,
      type: 'session_end',
      desc: 'Sitzung beendet (1 Min)',
    });
    const decision = evaluateProtectionAttempt({
      appId: 'instagram',
      config: makeConfig({
        mode: 'soft',
        antiBinge: {
          enabled: true,
          blockThreshold: 3,
          blockTimeframe: 20,
          warningThreshold: 3,
          warningTimeframe: 20,
        },
      }),
      // Two real openings, each followed by its session end.
      history: [sessionEnd(1), openEvent(2), sessionEnd(3), openEvent(4)],
      isFocusModeActive: false,
      now,
    });

    expect(decision.step).toBe('soft_intent');
  });

  it('warns when anti-binge warning threshold is reached', () => {
    const decision = evaluateProtectionAttempt({
      appId: 'instagram',
      config: makeConfig({
        mode: 'standard',
        antiBinge: {
          enabled: true,
          blockThreshold: 5,
          blockTimeframe: 20,
          warningThreshold: 2,
          warningTimeframe: 10,
        },
      }),
      history: [openEvent(1), openEvent(2)],
      isFocusModeActive: false,
      now,
    });

    expect(decision.step).toBe('anti_binge_warning');
    expect(decision.event?.type).toBe('warning');
  });
});

describe('countEmergencyUnlocksToday', () => {
  it('counts only emergency events on the same local day', () => {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    expect(
      countEmergencyUnlocksToday(
        [
          { id: 'old', timestamp: dayStart.getTime() - 1_000, type: 'emergency', desc: 'old' },
          { id: 'today', timestamp: dayStart.getTime() + 1_000, type: 'emergency', desc: 'today' },
          { id: 'block', timestamp: dayStart.getTime() + 2_000, type: 'block', desc: 'block' },
        ],
        now,
      ),
    ).toBe(1);
  });
});

describe('getAppUsageMinutesToday', () => {
  it('reads usage from the current local day bucket', () => {
    expect(
      getAppUsageMinutesToday(
        {
          '2026-06-15': {
            date: '2026-06-15',
            usageMinutes: { instagram: 17 },
            blockedOpens: 0,
            savedTimeMinutes: 0,
            emergencyUnlocks: 0,
            focusMinutes: 0,
          },
        },
        'instagram',
        now,
      ),
    ).toBe(17);
  });
});
