import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_CONFIG } from '../types';
import { applyPreset, getPresetId, NO_COOLDOWN } from './presets';
import { canAddSchedule, canProtectAnotherApp, FREE_LIMITS } from './entitlements';
import { getActiveScheduleForApp, getNextSchedule } from './schedules';
import { countReopens } from './metrics';
import { mergeScreenTime } from './stats';
import { migrateTimeWindowsToSchedules } from './state';

const config = { ...DEFAULT_APP_CONFIG, id: 'instagram' };

describe('presets', () => {
  it('starts every app on Ausgewogen', () => {
    expect(getPresetId(config)).toBe('ausgewogen');
  });

  it('writes the preset values into the rule fields the phone enforces', () => {
    const stark = applyPreset(config, 'stark');
    expect(stark).toMatchObject({ preset: 'stark', openDelay: 10, sessionLimit: 10 });
    expect(stark.antiBinge).toMatchObject({ enabled: true, blockThreshold: 3, blockTimeframe: 30 });

    const sanft = applyPreset(stark, 'sanft');
    expect(sanft.antiBinge.enabled).toBe(false);
    expect(applyPreset(config, 'ausgewogen').antiBinge.blockThreshold).toBe(NO_COOLDOWN);
  });

  it('recognises stored configs from before presets by their values', () => {
    const { preset: _preset, ...legacy } = applyPreset(config, 'sanft');
    expect(getPresetId({ ...legacy, id: 'instagram' })).toBe('sanft');
    expect(getPresetId({ ...legacy, id: 'instagram', openDelay: 25 })).toBe('eigene');
  });
});

describe('free limits', () => {
  const active = (id: string) => ({ ...config, id, active: true });

  it('allows two apps and one schedule without Pro', () => {
    const two = { instagram: active('instagram'), tiktok: active('tiktok') };
    expect(FREE_LIMITS.protectedApps).toBe(2);
    expect(canProtectAnotherApp({ appsConfig: { instagram: active('instagram') }, pro: { active: false } })).toBe(true);
    expect(canProtectAnotherApp({ appsConfig: two, pro: { active: false } })).toBe(false);
    expect(canProtectAnotherApp({ appsConfig: two, pro: { active: true } })).toBe(true);

    const schedule = { id: 's', name: 'Abend', startHour: 21, endHour: 7, appIds: [], active: true };
    expect(canAddSchedule({ schedules: [], pro: { active: false } })).toBe(true);
    expect(canAddSchedule({ schedules: [schedule], pro: { active: false } })).toBe(false);
  });
});

describe('schedules', () => {
  const evening = { id: 's', name: 'Abend', startHour: 21, endHour: 7, appIds: ['instagram'], active: true };

  it('locks across midnight', () => {
    expect(getActiveScheduleForApp([evening], 'instagram', new Date(2026, 9, 5, 23))).toBe(evening);
    expect(getActiveScheduleForApp([evening], 'instagram', new Date(2026, 9, 6, 6))).toBe(evening);
    expect(getActiveScheduleForApp([evening], 'instagram', new Date(2026, 9, 6, 7))).toBeUndefined();
    expect(getActiveScheduleForApp([evening], 'tiktok', new Date(2026, 9, 5, 23))).toBeUndefined();
  });

  it('finds the next start', () => {
    expect(getNextSchedule([evening], new Date(2026, 9, 5, 12))).toBe(evening);
    expect(getNextSchedule([{ ...evening, active: false }], new Date(2026, 9, 5, 12))).toBeNull();
  });

  it('turns the old fixed time windows into schedules', () => {
    const legacy = {
      instagram: {
        ...config,
        active: true,
        timeWindows: { ...config.timeWindows, enabled: true, nightRules: 'block' as const },
      },
    };
    const schedules = migrateTimeWindowsToSchedules(legacy);
    expect(schedules).toHaveLength(2); // the default config also has workRules: 'strict'
    expect(schedules.find((schedule) => schedule.name === 'Nacht')).toMatchObject({
      startHour: 22,
      endHour: 6,
      appIds: ['instagram'],
    });
  });
});

describe('metrics', () => {
  it('counts an opening within ten minutes of the previous one as a reopen', () => {
    const open = (minute: number) => ({
      id: `o${minute}`,
      timestamp: minute * 60_000,
      type: 'open' as const,
      appId: 'instagram',
      desc: '',
    });
    expect(countReopens([open(0), open(5), open(30), open(39)])).toBe(2);
  });
});

describe('screen time', () => {
  it('stores today and yesterday in the daily stats', () => {
    const stats = mergeScreenTime({}, { date: '2026-10-06', todayMinutes: 192, yesterdayMinutes: 220 });
    expect(stats['2026-10-06'].screenTimeMinutes).toBe(192);
    expect(stats['2026-10-05'].screenTimeMinutes).toBe(220);
    expect(mergeScreenTime(stats, { date: '2026-10-06', todayMinutes: 192, yesterdayMinutes: 220 })).toBe(stats);
  });
});
