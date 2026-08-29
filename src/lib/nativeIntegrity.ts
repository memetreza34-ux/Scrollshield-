import { Capacitor, registerPlugin } from '@capacitor/core';

interface ScrollShieldIntegrityPlugin {
  requestIntegrityToken(options: { nonce: string }): Promise<{ token?: unknown }>;
}

const AndroidIntegrity = registerPlugin<ScrollShieldIntegrityPlugin>('ScrollShieldIntegrity');

const SERVER_NONCE_PATTERN = /^[A-Za-z0-9_-]{22,500}$/;

export const isValidServerIntegrityNonce = (value: unknown): value is string =>
  typeof value === 'string' && SERVER_NONCE_PATTERN.test(value);

export const normalizeOpaqueIntegrityToken = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  return token.length >= 32 && token.length <= 16_384 ? token : null;
};

export const NativeIntegrity = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  },

  /**
   * Uses only a backend-issued one-time nonce and returns the opaque Play Integrity token.
   * This layer never decodes verdicts and never turns integrity output into paid access.
   */
  async requestTokenForServerChallenge(nonce: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Play Integrity is only available in the Android app');
    }
    if (!isValidServerIntegrityNonce(nonce)) {
      throw new Error('A valid server-issued Play Integrity nonce is required');
    }

    const result = await AndroidIntegrity.requestIntegrityToken({ nonce });
    const token = normalizeOpaqueIntegrityToken(result.token);
    if (!token) throw new Error('Play Integrity returned an invalid token');
    return token;
  },
};
