import { t } from '../i18n';

/** "3 Std. 12 Min." or "48 Min." */
export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return t('time.minutes', { minutes: rest });
  return rest === 0 ? t('time.hours', { hours }) : t('time.hoursMinutes', { hours, minutes: rest });
}

/** "07:00" for a whole hour. */
export const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

/** "Instagram, YouTube oder TikTok" / "… und …". */
export function joinNames(names: string[], word: 'or' | 'and') {
  if (names.length <= 1) return names[0] ?? '';
  return t(word === 'or' ? 'list.or' : 'list.and', {
    names: names.slice(0, -1).join(', '),
    last: names[names.length - 1],
  });
}

/** "14:32" – minutes and seconds of a longer lock. */
export const formatMinutesSeconds = (totalSeconds: number) => {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
};
