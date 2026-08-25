import { describe, expect, it } from 'vitest';
import { assessNativeProtectionHealth } from './nativeProtection';

const baseStatus = {
  running: false,
  enabled: true,
  lastStartAt: 900_000,
  lastStopAt: 950_000,
  lastStopCode: 'manual_app_stop',
  lastStopMessage: 'Älterer Stopp',
};

describe('NativeProtection start confirmation clock skew', () => {
  it('tolerates only a small future skew for a fresh pending request', () => {
    expect(
      assessNativeProtectionHealth(
        {
          ...baseStatus,
          lastStartRequestAt: 1_000_000,
        },
        995_001,
      ),
    ).toBe('start-pending');
  });

  it('fails out of pending when the wall clock moved materially backward', () => {
    expect(
      assessNativeProtectionHealth(
        {
          ...baseStatus,
          lastStartRequestAt: 1_000_000,
        },
        994_999,
      ),
    ).toBe('start-interrupted');
  });
});
