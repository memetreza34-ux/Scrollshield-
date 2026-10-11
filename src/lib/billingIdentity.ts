import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Native Firebase Auth owns refresh credentials. This wrapper deliberately
 * NEVER exposes ID tokens or Firebase refresh tokens to React or localStorage.
 */
export interface BillingAccountStatus {
  configured: boolean;
  signedIn: boolean;
  verified: boolean;
  email: string | null;
}

interface NativeIdentity {
  getStatus(): Promise<BillingAccountStatus>;
  refreshStatus(): Promise<BillingAccountStatus>;
  createAccount(args: { email: string; password: string }): Promise<BillingAccountStatus>;
  signIn(args: { email: string; password: string }): Promise<BillingAccountStatus>;
  sendVerificationEmail(): Promise<{ sent: boolean }>;
  requestPasswordReset(args: { email: string }): Promise<{ requested: boolean }>;
  signOut(): Promise<BillingAccountStatus>;
}

const bridge = registerPlugin<NativeIdentity>('ScrollShieldIdentity');
const unavailable: BillingAccountStatus = {
  configured: false,
  signedIn: false,
  verified: false,
  email: null,
};

const isAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const getBillingAccountStatus = (): Promise<BillingAccountStatus> =>
  isAndroid() ? bridge.getStatus() : Promise.resolve(unavailable);

export const refreshBillingAccountStatus = (): Promise<BillingAccountStatus> =>
  isAndroid() ? bridge.refreshStatus() : Promise.resolve(unavailable);

export const createBillingAccount = (email: string, password: string): Promise<BillingAccountStatus> => {
  if (!isAndroid()) return Promise.reject(new Error('ACCOUNT_ANDROID_ONLY'));
  return bridge.createAccount({ email, password });
};

export const signInBillingAccount = (email: string, password: string): Promise<BillingAccountStatus> => {
  if (!isAndroid()) return Promise.reject(new Error('ACCOUNT_ANDROID_ONLY'));
  return bridge.signIn({ email, password });
};

export const sendBillingVerificationEmail = (): Promise<boolean> =>
  isAndroid() ? bridge.sendVerificationEmail().then((r) => r.sent === true) : Promise.resolve(false);

export const requestBillingPasswordReset = (email: string): Promise<boolean> =>
  isAndroid() ? bridge.requestPasswordReset({ email }).then((r) => r.requested === true) : Promise.resolve(false);

export const signOutBillingAccount = (): Promise<BillingAccountStatus> =>
  isAndroid() ? bridge.signOut() : Promise.resolve(unavailable);
