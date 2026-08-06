import type { AppState } from '../types';

export const REELS_PLATFORM_IDS = ['instagram', 'youtube', 'tiktok', 'facebook', 'snapchat'] as const;

export const getActiveReelsCount = (appsConfig: AppState['appsConfig']) =>
  REELS_PLATFORM_IDS.filter((appId) => appsConfig[appId]?.reelsProtection?.enabled).length;

export const getLocalDateKey = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const createEventId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};
