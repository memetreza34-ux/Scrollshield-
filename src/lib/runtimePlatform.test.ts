import { describe, expect, it } from 'vitest';
import { resolveOperatingSystem } from './runtimePlatform';

describe('resolveOperatingSystem', () => {
  it('forces Android on an installed Android runtime even when old state says iOS', () => {
    expect(resolveOperatingSystem('ios', true, 'android')).toBe('android');
  });

  it('forces iOS on an installed iOS runtime even when old state says Android', () => {
    expect(resolveOperatingSystem('android', true, 'ios')).toBe('ios');
  });

  it('preserves the saved preview choice on the web', () => {
    expect(resolveOperatingSystem('ios', false, 'web')).toBe('ios');
    expect(resolveOperatingSystem('android', false, 'web')).toBe('android');
  });
});
