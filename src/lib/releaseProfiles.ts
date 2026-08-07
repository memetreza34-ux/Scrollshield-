import type { AppConfig, Profile } from '../types';
import { normalizeProtectionConfig } from './protectionConfig';

export interface ReleaseProfilePresentation {
  name: string;
  description: string;
}

const DEFAULT_PRESENTATION: Record<string, ReleaseProfilePresentation> = {
  gentle: {
    name: 'Sanft',
    description: 'Bewusste Pause mit kurzer Verzögerung, großzügigem Tageslimit und längeren freigegebenen Sitzungen.',
  },
  balance: {
    name: 'Balance',
    description: 'Deutlichere Öffnungspause, mittleres Tageslimit und kürzere Sitzungen für den Alltag.',
  },
  strict: {
    name: 'Streng',
    description: 'Normale Freigabe der geschützten App ist gesperrt. Dieses Preset enthält standardmäßig keinen Notfallzugang.',
  },
  noscroll: {
    name: 'Konsequent',
    description: 'Strikte Ganz-App-Sperre mit begrenztem Notfallweg, Countdown und Begründung statt einer normalen Freigabe.',
  },
};

export const getReleaseProfilePresentation = (profile: Profile): ReleaseProfilePresentation =>
  DEFAULT_PRESENTATION[profile.id] ?? {
    name: profile.name,
    description: profile.description,
  };

export const getReleaseSafeProfileConfig = (config: AppConfig): AppConfig =>
  normalizeProtectionConfig({
    ...config,
    reelsProtection: {
      ...config.reelsProtection,
      enabled: false,
      mode: 'allow',
      warnOnEndlessScroll: false,
      hardInterrupt: false,
    },
    singleContent: {
      ...config.singleContent,
      allowSharedLinks: false,
      allowOnlyOne: false,
    },
  });

export const summarizeReleaseProfile = (profile: Profile) => {
  const configs = Object.values(profile.appsConfig).map(getReleaseSafeProfileConfig);
  const protectedApps = configs.filter((config) => config.active).length;
  const strictApps = configs.filter((config) => config.active && config.mode === 'strict').length;
  return { protectedApps, strictApps };
};
