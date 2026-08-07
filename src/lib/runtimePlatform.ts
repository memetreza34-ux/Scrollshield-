import { Capacitor } from '@capacitor/core';
import type { AppState } from '../types';

type OperatingSystem = AppState['operatingSystem'];

export const resolveOperatingSystem = (
  savedOperatingSystem: OperatingSystem,
  nativePlatform: boolean,
  runtimePlatform: string,
): OperatingSystem => {
  if (!nativePlatform) return savedOperatingSystem;
  if (runtimePlatform === 'android') return 'android';
  if (runtimePlatform === 'ios') return 'ios';
  return savedOperatingSystem;
};

export const getRuntimeOperatingSystem = (savedOperatingSystem: OperatingSystem): OperatingSystem =>
  resolveOperatingSystem(savedOperatingSystem, Capacitor.isNativePlatform(), Capacitor.getPlatform());
