import { afterEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  schedule: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>();
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } };
});
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: plugin }));

import {
  buildFocusFinished,
  cancelNotification,
  notificationIdForTag,
  requestNotificationPermission,
  scheduleNotification,
  sendNotification,
} from './notifications';

afterEach(() => {
  vi.clearAllMocks();
});

describe('native notifications', () => {
  it('shows a notification through the plugin when permitted', async () => {
    plugin.checkPermissions.mockResolvedValue({ display: 'granted' });
    plugin.schedule.mockResolvedValue({ notifications: [] });

    expect(await sendNotification(buildFocusFinished(25))).toBe(true);

    const [{ notifications }] = plugin.schedule.mock.calls[0];
    expect(notifications).toEqual([
      {
        id: notificationIdForTag('focus-finished'),
        title: 'Fokuszeit beendet',
        body: '25 Minuten durchgehalten. Gut gemacht.',
        isExactNotification: false,
      },
    ]);
  });

  it('schedules an inexact alarm that may fire while the device idles', async () => {
    plugin.checkPermissions.mockResolvedValue({ display: 'granted' });
    plugin.schedule.mockResolvedValue({ notifications: [] });
    const at = new Date(2030, 0, 1, 12, 25);

    expect(await scheduleNotification(buildFocusFinished(25), at)).toBe(true);

    const [{ notifications }] = plugin.schedule.mock.calls[0];
    expect(notifications[0]).toMatchObject({ isExactNotification: false, schedule: { at, allowWhileIdle: true } });
  });

  it('never prompts for permission on its own', async () => {
    plugin.checkPermissions.mockResolvedValue({ display: 'prompt' });

    expect(await sendNotification(buildFocusFinished(25))).toBe(false);
    expect(plugin.requestPermissions).not.toHaveBeenCalled();
    expect(plugin.schedule).not.toHaveBeenCalled();
  });

  it('asks the system when the user requests the permission', async () => {
    plugin.requestPermissions.mockResolvedValue({ display: 'granted' });

    expect(await requestNotificationPermission()).toBe(true);
  });

  it('withdraws a notification by its tag', async () => {
    await cancelNotification('focus-finished');

    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: notificationIdForTag('focus-finished') }] });
  });
});

describe('notificationIdForTag', () => {
  it('is stable per tag and stays clear of the monitor notification', () => {
    expect(notificationIdForTag('evening-2030-01-01')).toBe(notificationIdForTag('evening-2030-01-01'));
    expect(notificationIdForTag('evening-2030-01-01')).not.toBe(notificationIdForTag('evening-2030-01-02'));
    for (const tag of ['focus-finished', 'relapse-warning', '', 'x']) {
      const id = notificationIdForTag(tag);
      expect(id).toBeGreaterThanOrEqual(10_000);
      expect(id).toBeLessThanOrEqual(2 ** 31 - 1);
    }
  });
});
