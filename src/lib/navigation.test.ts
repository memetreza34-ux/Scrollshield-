import { describe, expect, it } from 'vitest';
import { getBackTarget } from './navigation';

describe('getBackTarget', () => {
  it('goes one step up, like the header arrow', () => {
    expect(getBackTarget('app_detail', true)).toBe('apps');
    expect(getBackTarget('imprint', true)).toBe('support');
    expect(getBackTarget('privacy', true)).toBe('settings');
  });

  it('returns to the onboarding from the setup permissions, to the settings afterwards', () => {
    expect(getBackTarget('permissions', false)).toBe('onboarding');
    expect(getBackTarget('permissions', true)).toBe('settings');
  });

  it('sends the app to the background from a start screen', () => {
    expect(getBackTarget('dashboard', true)).toBeNull();
    expect(getBackTarget('welcome', false)).toBeNull();
    expect(getBackTarget('active_session', true)).toBeNull();
  });
});
