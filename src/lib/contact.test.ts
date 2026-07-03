import { describe, expect, it } from 'vitest';
import { createDeletionRequestMailto, createPrivacyRequestMailto, createSupportMailto } from './contact';

describe('createSupportMailto', () => {
  it('encodes support subjects safely', () => {
    expect(createSupportMailto('Problem melden: ScrollShield & Test')).toBe(
      'mailto:support@scrollshield.app?subject=Problem+melden%3A+ScrollShield+%26+Test',
    );
  });

  it('encodes optional bodies safely', () => {
    expect(createSupportMailto('Datenschutz', 'Zeile 1\nZeile 2')).toBe(
      'mailto:support@scrollshield.app?subject=Datenschutz&body=Zeile+1%0AZeile+2',
    );
  });

  it('creates privacy request subjects', () => {
    expect(createPrivacyRequestMailto()).toContain('subject=Datenschutzanfrage%3A+ScrollShield');
    expect(createPrivacyRequestMailto()).toContain('body=');
  });

  it('creates deletion request subjects', () => {
    expect(createDeletionRequestMailto()).toContain('subject=Datenl%C3%B6schanfrage%3A+ScrollShield');
    expect(createDeletionRequestMailto()).toContain('body=');
  });
});
