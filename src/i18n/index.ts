import { de } from './de';
import { en } from './en';

export type Language = 'de' | 'en';
/** What the user picked in the settings; 'system' follows the phone. */
export type LanguageSetting = Language | 'system';
export type MessageKey = keyof typeof de;
export type Messages = Record<MessageKey, string>;

const MESSAGES: Record<Language, Messages> = { de, en };

/** The phone's language: German if it is German, English for everything else. */
export function detectLanguage(): Language {
  const language = typeof navigator === 'undefined' ? '' : (navigator.language ?? '');
  return language.toLowerCase().startsWith('de') ? 'de' : 'en';
}

export const resolveLanguage = (setting: LanguageSetting | undefined): Language =>
  setting === 'de' || setting === 'en' ? setting : detectLanguage();

let current: Language = detectLanguage();

export const getLanguage = () => current;

/** Set by the app on every render from the setting, so t() and the page agree. */
export function setLanguage(language: Language) {
  current = language;
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}

/** The text for a key in the current language; {name} placeholders are filled from `values`. */
export function t(key: MessageKey, values?: Record<string, string | number>): string {
  const text = MESSAGES[current][key];
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  );
}
