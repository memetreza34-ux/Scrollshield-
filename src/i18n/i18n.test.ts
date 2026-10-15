import { afterEach, describe, expect, it } from 'vitest';
import { de } from './de';
import { en } from './en';
import { detectLanguage, resolveLanguage, setLanguage, t } from './index';

afterEach(() => setLanguage('de'));

describe('i18n', () => {
  it('has the same keys in German and English', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(de).sort());
  });

  it('keeps the placeholders of every text in both languages', () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(de) as (keyof typeof de)[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(de[key]));
    }
  });

  it('fills placeholders and switches language', () => {
    setLanguage('de');
    expect(t('onboarding.step', { step: 2 })).toBe('Schritt 2 von 3');
    setLanguage('en');
    expect(t('onboarding.step', { step: 2 })).toBe('Step 2 of 3');
    expect(document.documentElement.lang).toBe('en');
  });

  it('follows the phone: German for German, English for everything else', () => {
    expect(detectLanguage()).toBe('de');
    Object.defineProperty(window.navigator, 'language', { value: 'fr-FR', configurable: true });
    expect(detectLanguage()).toBe('en');
    expect(resolveLanguage('system')).toBe('en');
    expect(resolveLanguage('de')).toBe('de');
    Object.defineProperty(window.navigator, 'language', { value: 'de-DE', configurable: true });
  });

  it('uses none of the words the app must not say', () => {
    // At the start of a word, so "Öffnungsversuche" stays allowed.
    const forbidden =
      /(^|[^a-zäöüß])(sucht|süchtig|rückfall|therapie|heilen|adhs|addict|relapse|therapy|adhd|gespart|saved time)/i;
    for (const text of [...Object.values(de), ...Object.values(en)]) {
      expect(text).not.toMatch(forbidden);
    }
  });
});
