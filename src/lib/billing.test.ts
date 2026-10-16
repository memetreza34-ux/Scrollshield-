import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../i18n';
import { formatPeriod, proAfterStatus } from './billing';

afterEach(() => setLanguage('de'));

describe('formatPeriod', () => {
  it('turns Google Play periods into words', () => {
    setLanguage('de');
    expect(formatPeriod('P7D')).toBe('7 Tage');
    expect(formatPeriod('P1W')).toBe('7 Tage');
    expect(formatPeriod('P1D')).toBe('1 Tag');
    expect(formatPeriod('P1M')).toBe('1 Monat');
    expect(formatPeriod('P3M')).toBe('3 Monate');
    setLanguage('en');
    expect(formatPeriod('P2W')).toBe('14 days');
    expect(formatPeriod('P1Y')).toBe('1 year');
  });

  it('gives up on anything it does not know', () => {
    expect(formatPeriod(undefined)).toBeNull();
    expect(formatPeriod('P1Y2M')).toBeNull();
    expect(formatPeriod('7 days')).toBeNull();
  });
});

describe('proAfterStatus', () => {
  it('follows Google Play when it answers', () => {
    expect(proAfterStatus({ available: true, active: false }, true)).toBe(false);
    expect(proAfterStatus({ available: true, active: true }, false)).toBe(true);
  });

  it('keeps what the app knew when Google Play cannot answer', () => {
    expect(proAfterStatus({ available: false, active: false }, true)).toBe(true);
  });
});
