import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getPermissionStatusMock,
  getPlatformMock,
  isNativePlatformMock,
  notificationOpenSettingsMock,
  notificationRequestMock,
  openPermissionSettingsMock,
} = vi.hoisted(() => ({
  getPermissionStatusMock: vi.fn(),
  getPlatformMock: vi.fn(),
  isNativePlatformMock: vi.fn(),
  notificationOpenSettingsMock: vi.fn(),
  notificationRequestMock: vi.fn(),
  openPermissionSettingsMock: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatformMock(),
    getPlatform: () => getPlatformMock(),
  },
  registerPlugin: (name: string) =>
    name === 'ScrollShieldNotifications'
      ? {
          requestPermission: () => notificationRequestMock(),
          openSettings: () => notificationOpenSettingsMock(),
        }
      : {
          getPermissionStatus: () => getPermissionStatusMock(),
          openPermissionSettings: (...args: unknown[]) => openPermissionSettingsMock(...args),
        },
}));

import { NativePermissions } from './nativePermissions';

describe('NativePermissions', () => {
  beforeEach(() => {
    isNativePlatformMock.mockReset();
    getPlatformMock.mockReset();
    getPermissionStatusMock.mockReset();
    notificationRequestMock.mockReset();
    notificationOpenSettingsMock.mockReset();
    openPermissionSettingsMock.mockReset();

    isNativePlatformMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');
    notificationRequestMock.mockResolvedValue({ granted: true });
    notificationOpenSettingsMock.mockResolvedValue(undefined);
    openPermissionSettingsMock.mockResolvedValue(undefined);
  });

  it('routes the Android notification prompt to the dedicated plugin', async () => {
    await expect(NativePermissions.requestAndroidNotifications()).resolves.toBe(true);

    expect(notificationRequestMock).toHaveBeenCalledTimes(1);
    expect(openPermissionSettingsMock).not.toHaveBeenCalled();
  });

  it('routes notification settings to the protection channel', async () => {
    await NativePermissions.openAndroidSettings('notifications');

    expect(notificationOpenSettingsMock).toHaveBeenCalledTimes(1);
    expect(openPermissionSettingsMock).not.toHaveBeenCalled();
  });

  it('keeps other Android settings on the main native plugin', async () => {
    await NativePermissions.openAndroidSettings('overlay');

    expect(openPermissionSettingsMock).toHaveBeenCalledWith({ permission: 'overlay' });
    expect(notificationOpenSettingsMock).not.toHaveBeenCalled();
  });

  it('does not invoke native plugins in the browser preview', async () => {
    isNativePlatformMock.mockReturnValue(false);

    await expect(NativePermissions.getAndroidStatus()).resolves.toBeNull();
    await expect(NativePermissions.requestAndroidNotifications()).resolves.toBe(false);
    await NativePermissions.openAndroidSettings('notifications');

    expect(getPermissionStatusMock).not.toHaveBeenCalled();
    expect(notificationRequestMock).not.toHaveBeenCalled();
    expect(notificationOpenSettingsMock).not.toHaveBeenCalled();
  });
});
