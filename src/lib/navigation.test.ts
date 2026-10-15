import { describe, expect, it } from 'vitest';
import { getBackTarget } from './navigation';

describe('getBackTarget', () => {
  it('goes one step up, like the header arrow', () => {
    expect(getBackTarget('app_detail', true)).toBe('protect');
    expect(getBackTarget('insights', true)).toBe('today');
    expect(getBackTarget('imprint', true)).toBe('settings');
    expect(getBackTarget('privacy', true)).toBe('settings');
  });

  it('returns to the onboarding from the setup permissions, to the settings afterwards', () => {
    expect(getBackTarget('permissions', false)).toBe('onboarding');
    expect(getBackTarget('permissions', true)).toBe('settings');
  });

  it('returns to the welcome screen from the pages readable before the onboarding', () => {
    expect(getBackTarget('support', false)).toBe('welcome');
    expect(getBackTarget('support', true)).toBe('settings');
  });

  it('sends the app to the background from a start screen', () => {
    expect(getBackTarget('today', true)).toBeNull();
    expect(getBackTarget('welcome', false)).toBeNull();
    expect(getBackTarget('active_session', true)).toBeNull();
  });
});
