import { describe, expect, it } from 'vitest';
import { isValidServerIntegrityNonce, normalizeOpaqueIntegrityToken } from './nativeIntegrity';

describe('Play Integrity client boundary', () => {
  it('accepts only URL-safe unpadded server challenge nonces in the bounded range', () => {
    expect(isValidServerIntegrityNonce('AbCdEfGhIjKlMnOpQrStUv')).toBe(true);
    expect(isValidServerIntegrityNonce('a'.repeat(500))).toBe(true);
    expect(isValidServerIntegrityNonce('a'.repeat(21))).toBe(false);
    expect(isValidServerIntegrityNonce('a'.repeat(501))).toBe(false);
    expect(isValidServerIntegrityNonce('server+nonce/with=padding')).toBe(false);
  });

  it('treats the Integrity response as an opaque bounded transport token only', () => {
    const token = 'opaque-integrity-token-'.padEnd(64, 'x');
    expect(normalizeOpaqueIntegrityToken(token)).toBe(token);
    expect(normalizeOpaqueIntegrityToken('short')).toBeNull();
    expect(normalizeOpaqueIntegrityToken('x'.repeat(16_385))).toBeNull();
    expect(normalizeOpaqueIntegrityToken({ token: 'not-a-string' })).toBeNull();
  });
});
