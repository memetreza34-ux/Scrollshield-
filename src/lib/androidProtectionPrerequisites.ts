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

const REQUIRED_PREREQUISITES: AndroidProtectionPrerequisiteKey[] = [
  'usageAccess',
  'overlay',
  'notifications',
];

export const getMissingAndroidProtectionPrerequisites = (
  status: AndroidProtectionPrerequisiteStatus,
): AndroidProtectionPrerequisiteKey[] =>
  REQUIRED_PREREQUISITES.filter((key) => status[key] !== true);

export const describeMissingAndroidProtectionPrerequisites = (
  missing: AndroidProtectionPrerequisiteKey[],
): string => missing.map((key) => PREREQUISITE_LABELS[key]).join(', ');
