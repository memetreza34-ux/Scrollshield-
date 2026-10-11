import { describe, expect, it } from 'vitest';
import {
  createBillingAccount,
  getBillingAccountStatus,
  requestBillingPasswordReset,
  signInBillingAccount,
  signOutBillingAccount,
} from './billingIdentity';

describe('Firebase account platform boundary', () => {
  it('has no Firebase user session or tokens in a browser', async () => {
    await expect(getBillingAccountStatus()).resolves.toEqual({
      configured: false,
      signedIn: false,
      verified: false,
      email: null,
    });
  });

  it('refuses sign-in and account creation when Android Auth is unavailable', async () => {
    await expect(signInBillingAccount('test@example.com', 'not-secret')).rejects.toThrow('ACCOUNT_ANDROID_ONLY');
    await expect(createBillingAccount('test@example.com', 'not-secret')).rejects.toThrow('ACCOUNT_ANDROID_ONLY');
  });

  it('never sends password-reset requests to an unknown browser provider', async () => {
    await expect(requestBillingPasswordReset('test@example.com')).resolves.toBe(false);
    await expect(signOutBillingAccount()).resolves.toMatchObject({ signedIn: false });
  });
});
