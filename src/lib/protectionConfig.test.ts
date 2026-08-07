import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_CONFIG } from '../types';
import { normalizeProtectionConfig } from './protectionConfig';

describe('normalizeProtectionConfig', () => {
  it('bounds extreme values before they reach the native protection engine', () => {
    const normalized = normalizeProtectionConfig({
      id: 'instagram',
      ...DEFAULT_APP_CONFIG,
      openDelay: 99_999,
      dailyLimit: 99_999,
      sessionLimit: 0,
      antiBinge: {
        ...DEFAULT_APP_CONFIG.antiBinge,
        warningThreshold: 99,
        warningTimeframe: 99_999,
        blockThreshold: -5,
        blockTimeframe: 99_999,
      },
      emergencyUnlock: {
        ...DEFAULT_APP_CONFIG.emergencyUnlock,
        durationMinutes: 99_999,
        maxPerDay: 99,
      },
    });

    expect(normalized.openDelay).toBe(120);
    expect(normalized.dailyLimit).toBe(1440);
    expect(normalized.sessionLimit).toBe(1);
    expect(normalized.antiBinge.warningThreshold).toBe(10);
    expect(normalized.antiBinge.blockThreshold).toBe(11);
    expect(normalized.antiBinge.warningTimeframe).toBe(180);
    expect(normalized.antiBinge.blockTimeframe).toBe(180);
    expect(normalized.emergencyUnlock.durationMinutes).toBe(60);
    expect(normalized.emergencyUnlock.maxPerDay).toBe(10);
  });

  it('keeps disabled daily limits and delays but never creates a zero-minute session', () => {
    const normalized = normalizeProtectionConfig({
      id: 'instagram',
      ...DEFAULT_APP_CONFIG,
      openDelay: 0,
      dailyLimit: 0,
      sessionLimit: 0,
    });

    expect(normalized.openDelay).toBe(0);
    expect(normalized.dailyLimit).toBe(0);
    expect(normalized.sessionLimit).toBe(1);
  });

  it('ensures the strict Anti-Binge block happens after the warning threshold', () => {
    const normalized = normalizeProtectionConfig({
      id: 'instagram',
      ...DEFAULT_APP_CONFIG,
      antiBinge: {
        ...DEFAULT_APP_CONFIG.antiBinge,
        warningThreshold: 8,
        blockThreshold: 4,
      },
    });

    expect(normalized.antiBinge.warningThreshold).toBe(8);
    expect(normalized.antiBinge.blockThreshold).toBe(9);
  });

  it('collapses legacy soft mode to standard because Android v1 enforces them identically', () => {
    const normalized = normalizeProtectionConfig({
      id: 'instagram',
      ...DEFAULT_APP_CONFIG,
      mode: 'soft',
    });

    expect(normalized.mode).toBe('standard');
  });

  it('keeps an enabled emergency path usable while disabled emergency may retain zero daily releases', () => {
    const enabled = normalizeProtectionConfig({
      id: 'instagram',
      ...DEFAULT_APP_CONFIG,
      emergencyUnlock: {
        ...DEFAULT_APP_CONFIG.emergencyUnlock,
        enabled: true,
        maxPerDay: 0,
      },
    });
    const disabled = normalizeProtectionConfig({
      id: 'instagram',
      ...DEFAULT_APP_CONFIG,
      emergencyUnlock: {
        ...DEFAULT_APP_CONFIG.emergencyUnlock,
        enabled: false,
        maxPerDay: 0,
      },
    });

    expect(enabled.emergencyUnlock.maxPerDay).toBe(1);
    expect(disabled.emergencyUnlock.maxPerDay).toBe(0);
  });
});