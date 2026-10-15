import { describe, expect, it } from 'vitest';
import { AppState, DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { effectiveAppsConfig, mustChooseFreeApps } from './entitlements';
import { applyPreset } from './presets';

const app = (id: string, active = true) => ({ ...DEFAULT_APP_CONFIG, id, active });

const stateWith = (appsConfig: AppState['appsConfig'], pro = false) => ({
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  appsConfig,
  pro: { active: pro },
});

describe('effectiveAppsConfig', () => {
  it('protects an app set to "Stark" as "Ausgewogen" without Pro and keeps the stored values', () => {
    const state = stateWith({ instagram: applyPreset(app('instagram'), 'stark') });

    const effective = effectiveAppsConfig(state);

    expect(effective.instagram.preset).toBe('ausgewogen');
    expect(effective.instagram.sessionLimit).toBe(0);
    expect(state.appsConfig.instagram.preset).toBe('stark');
  });

  it('leaves everything as it is with Pro', () => {
    const state = stateWith({ instagram: applyPreset(app('instagram'), 'stark') }, true);

    expect(effectiveAppsConfig(state)).toBe(state.appsConfig);
  });
});

describe('mustChooseFreeApps', () => {
  it('asks when Pro ended with more apps than Free protects', () => {
    const three = { instagram: app('instagram'), tiktok: app('tiktok'), youtube: app('youtube') };

    expect(mustChooseFreeApps(stateWith(three))).toBe(true);
    expect(mustChooseFreeApps(stateWith(three, true))).toBe(false);
    expect(mustChooseFreeApps(stateWith({ ...three, youtube: app('youtube', false) }))).toBe(false);
  });
});
