import type { AppPermissions } from '../types';

export type AndroidProtectionPrerequisiteKey = 'usageAccess' | 'overlay' | 'notifications';

export type AndroidProtectionPrerequisiteStatus = Pick<
  AppPermissions,
  AndroidProtectionPrerequisiteKey
>;

const PREREQUISITE_LABELS: Record<AndroidProtectionPrerequisiteKey, string> = {
  usageAccess: 'App-Nutzungszugriff',
  overlay: 'Hinweis über anderen Apps',
  notifications: 'Benachrichtigungen',
};

const STOP_CODE_TO_PREREQUISITE: Record<string, AndroidProtectionPrerequisiteKey> = {
  usage_access_missing: 'usageAccess',
  overlay_permission_missing: 'overlay',
  notifications_missing: 'notifications',
};

const REQUIRED_PREREQUISITES: AndroidProtectionPrerequisiteKey[] = [
  'usageAccess',
  'overlay',
  'notifications',
];

export const getMissingAndroidProtectionPrerequisites = (
  status: AndroidProtectionPrerequisiteStatus,
): AndroidProtectionPrerequisiteKey[] =>
  REQUIRED_PREREQUISITES.filter((key) => status[key] !== true);

export const getAndroidProtectionPrerequisiteForStopCode = (
  stopCode: string,
): AndroidProtectionPrerequisiteKey | null => STOP_CODE_TO_PREREQUISITE[stopCode.trim()] ?? null;

export const describeMissingAndroidProtectionPrerequisites = (
  missing: AndroidProtectionPrerequisiteKey[],
): string => missing.map((key) => PREREQUISITE_LABELS[key]).join(', ');
