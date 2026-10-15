import { describe, expect, it } from 'vitest';
import { createSupportMailto } from './contact';

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
});
