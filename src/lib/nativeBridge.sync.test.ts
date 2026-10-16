import { beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  syncBlockedApps: vi.fn(async () => ({ synced: true, ruleCount: 1 })),
  startMonitoring: vi.fn(async () => ({ started: true })),
  stopMonitoring: vi.fn(async () => ({ stopped: true })),
}));

vi.mock('@capacitor/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@capacitor/core')>()),
  registerPlugin: () => native,
}));

import { syncNativeBlockList } from './nativeBridge';

const platforms = [{ id: 'instagram', androidPackages: ['com.instagram.android'] }];
const appsConfig = { instagram: { active: true, mode: 'standard' as const, openDelay: 5 } };

describe('syncNativeBlockList', () => {
  beforeEach(() => native.syncBlockedApps.mockClear());

  it('sends the own pause line along with the rules', async () => {
    await syncNativeBlockList(appsConfig, platforms, { pauseLine: 'Abends lieber lesen als scrollen.' });

    expect(native.syncBlockedApps).toHaveBeenCalledWith(
      expect.objectContaining({ monitoringEnabled: true, pauseLine: 'Abends lieber lesen als scrollen.' }),
    );
  });

  it('sends an empty line when none is set, so the phone drops an old one', async () => {
    await syncNativeBlockList(appsConfig, platforms);

    expect(native.syncBlockedApps).toHaveBeenCalledWith(expect.objectContaining({ pauseLine: '' }));
  });
});
