const STORAGE_PREFIX = 'scrollshield_';

export type LegacyRecoveryPackage = {
  app: 'ScrollShield';
  kind: 'legacy-recovery';
  schemaVersion: 1;
  exportedAt: string;
  rawEntries: Record<string, string>;
};

const readScrollShieldEntries = (): Record<string, string> => {
  const rawEntries: Record<string, string> = {};
  for (const key of Object.keys(localStorage).sort()) {
    if (!key.startsWith(STORAGE_PREFIX)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) rawEntries[key] = value;
  }
  return rawEntries;
};

export const createLegacyRecoveryPackage = (exportedAt = new Date()): LegacyRecoveryPackage | null => {
  const rawEntries = readScrollShieldEntries();
  if (Object.keys(rawEntries).length === 0) return null;
  return {
    app: 'ScrollShield',
    kind: 'legacy-recovery',
    schemaVersion: 1,
    exportedAt: exportedAt.toISOString(),
    rawEntries,
  };
};

export const serializeLegacyRecoveryPackage = (data: LegacyRecoveryPackage): string =>
  JSON.stringify(data, null, 2);

export const createLegacyRecoveryFilename = (date = new Date()): string =>
  `scrollshield-legacy-recovery-${date.toISOString().slice(0, 10)}.json`;
