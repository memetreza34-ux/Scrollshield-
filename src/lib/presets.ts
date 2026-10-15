import { t } from '../i18n';
import type { AppConfig } from '../types';

/**
 * Protection presets (docs/V1_MASTER_PLAN.md, section 5)
 * ══════════════════════════════════════════════════════
 * A preset is a named set of values for the rule fields the native service
 * already enforces. The values are product defaults, not research findings.
 *
 * Reopen protection runs on the anti-binge rule: every opening within
 * `warningTimeframe` minutes adds `escalationSeconds` to the pause;
 * `blockThreshold` openings within `blockTimeframe` lock the app until the
 * oldest of them is older than the timeframe – the cooldown.
 */

export type PresetId = 'sanft' | 'ausgewogen' | 'stark' | 'eigene';

/** A blockThreshold nobody reaches: reopen protection without cooldown. */
export const NO_COOLDOWN = 99;

type PresetValues = Pick<AppConfig, 'mode' | 'openDelay' | 'dailyLimit' | 'sessionLimit' | 'antiBinge'>;

export interface PresetDefinition {
  id: Exclude<PresetId, 'eigene'>;
  label: string;
  summary: string;
  pro: boolean;
  values: PresetValues;
}

export const PRESETS: PresetDefinition[] = [
  {
    id: 'sanft',
    label: 'Sanft',
    summary: 'Kurze Pause beim Öffnen. Kein zusätzlicher Widerstand beim Wiederöffnen.',
    pro: false,
    values: {
      mode: 'standard',
      openDelay: 3,
      dailyLimit: 0,
      sessionLimit: 0,
      antiBinge: {
        enabled: false,
        warningThreshold: 1,
        warningTimeframe: 10,
        blockThreshold: NO_COOLDOWN,
        blockTimeframe: 30,
        escalationSeconds: 0,
      },
    },
  },
  {
    id: 'ausgewogen',
    label: 'Ausgewogen',
    summary: '5 Sekunden Pause. Wer innerhalb von 10 Minuten wieder öffnet, wartet jedes Mal 10 Sekunden länger.',
    pro: false,
    values: {
      mode: 'standard',
      openDelay: 5,
      dailyLimit: 0,
      sessionLimit: 0,
      antiBinge: {
        enabled: true,
        warningThreshold: 1,
        warningTimeframe: 10,
        blockThreshold: NO_COOLDOWN,
        blockTimeframe: 30,
        escalationSeconds: 10,
      },
    },
  },
  {
    id: 'stark',
    label: 'Stark',
    summary:
      '10 Sekunden Pause, bei jedem Wiederöffnen 20 Sekunden mehr. Beim dritten Öffnen in 30 Minuten folgt eine Abkühlzeit. Nach 10 Minuten am Stück fragt ScrollShield nach.',
    pro: true,
    values: {
      mode: 'standard',
      openDelay: 10,
      dailyLimit: 0,
      sessionLimit: 10,
      antiBinge: {
        enabled: true,
        warningThreshold: 1,
        warningTimeframe: 10,
        blockThreshold: 3,
        blockTimeframe: 30,
        escalationSeconds: 20,
      },
    },
  },
];

export const EIGENE_PRESET = {
  id: 'eigene' as const,
  label: 'Eigene Regeln',
  summary: 'Pause, Wiederöffnen, Sitzung und Tagesbudget frei einstellen.',
  pro: true,
};

export const getPreset = (id: PresetId) => PRESETS.find((preset) => preset.id === id);

/** In the current language; the German texts above stay as the reference. */
export const getPresetLabel = (id: PresetId) => t(`preset.${id}.label`);
export const getPresetSummary = (id: PresetId) => t(`preset.${id}.summary`);

/** The config with a preset's values. Choosing "Eigene" keeps the current values. */
export function applyPreset(config: AppConfig, id: PresetId): AppConfig {
  const preset = getPreset(id);
  if (!preset) return { ...config, preset: 'eigene' };
  return { ...config, ...preset.values, antiBinge: { ...preset.values.antiBinge }, preset: id };
}

/** The preset a config was set to; configs from before presets existed count as "Eigene" unless they match one. */
export function getPresetId(config: AppConfig): PresetId {
  if (config.preset) return config.preset;
  const match = PRESETS.find(
    (preset) =>
      preset.values.mode === config.mode &&
      preset.values.openDelay === config.openDelay &&
      preset.values.dailyLimit === config.dailyLimit &&
      preset.values.sessionLimit === (config.sessionLimit ?? 0) &&
      preset.values.antiBinge.enabled === config.antiBinge.enabled &&
      preset.values.antiBinge.blockThreshold === config.antiBinge.blockThreshold,
  );
  return match?.id ?? 'eigene';
}

/** Lower is looser. Used to stop a self-commitment from being undone by picking a weaker preset. */
export const PRESET_STRENGTH: Record<PresetId, number> = { sanft: 0, ausgewogen: 1, stark: 2, eigene: 2 };
