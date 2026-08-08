import { useEffect, useRef, useState } from 'react';
import { Activity, Bell, Eye, Info, Layers, RefreshCw, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { NativeProtectionStatusPanel } from '../components/NativeProtectionStatusPanel';
import { Header } from '../components/ui';
import { isCommitmentLockActive, type CommitmentLock } from '../lib/commitmentLock';
import { NativePermissions } from '../lib/nativePermissions';
import { NativeProtection } from '../lib/nativeProtection';
import type { NativeProtectionStatus } from '../lib/nativeProtection';
import type { AppPermissions, AppState, Screen } from '../types';

type RequiredAndroidPermission = 'usageAccess' | 'overlay' | 'notifications';
type AndroidSettingsPermission = RequiredAndroidPermission | 'backgroundActivity';

type PermissionCard = {
  key: AndroidSettingsPermission;
  title: string;
  description: string;
  missing: string;
  icon: typeof Eye;
  optional?: boolean;
};

const REQUIRED_ANDROID_PERMISSIONS: RequiredAndroidPermission[] = [
  'usageAccess',
  'overlay',
  'notifications',
];

const PERMISSION_CARDS: PermissionCard[] = [
  {
    key: 'usageAccess',
    title: 'App-Nutzungszugriff',
    description: 'Erkennt lokal, welche unterstützte geschützte App im Vordergrund ist und wie lange eine freigegebene Sitzung genutzt wird.',
    missing: 'Ohne Nutzungszugriff kann ScrollShield geschützte App-Öffnungen nicht zuverlässig erkennen.',
    icon: Eye,
  },
  {
    key: 'overlay',
    title: 'Hinweis über anderen Apps',
    description: 'Zeigt den ScrollShield-Unterbrechungsbildschirm, Countdown, Rückweg und eine begrenzte Notfallfreigabe über der geschützten App.',
    missing: 'Ohne Overlay-Zugriff kann der sichtbare Schutzbildschirm nicht eingeblendet werden.',
    icon: Layers,
  },
  {
    key: 'notifications',
    title: 'Benachrichtigungen',
    description: 'Hält den laufenden Android-Schutzdienst sichtbar. Android behält seine Systemkontrolle über den laufenden Dienst.',
    missing: 'Ohne sichtbare Benachrichtigung startet der Android-Schutzdienst nicht.',
    icon: Bell,
  },
  {
    key: 'backgroundActivity',
    title: 'Akku-Optimierung prüfen',
    description: 'Öffnet die Android-Akkueinstellungen. Eine Ausnahme kann auf Geräten mit aggressiver Hintergrundbegrenzung die Zuverlässigkeit verbessern.',
    missing: 'Dieser Zugriff ist optional. Ohne Ausnahme kann Android den Schutz auf manchen Geräten früher beenden.',
    icon: Activity,
    optional: true,
  },
];

const requiredPermissionsReady = (permissions: AppPermissions) =>
  REQUIRED_ANDROID_PERMISSIONS.every((permission) => permissions[permission]);

export function ReleasePermissionsScreen({
  state,
  updateState,
  navigate,
  isOnboarding = false,
  commitmentLock = null,
}: {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  navigate: (screen: Screen) => void;
  isOnboarding?: boolean;
  commitmentLock?: CommitmentLock | null;
}) {
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [openingSetting, setOpeningSetting] = useState<AndroidSettingsPermission | null>(null);
  const [serviceBusy, setServiceBusy] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<NativeProtectionStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const updateStateRef = useRef(updateState);
  const permissionsRef = useRef(state.permissions);

  updateStateRef.current = updateState;
  permissionsRef.current = state.permissions;

  const nativeAndroid = state.operatingSystem === 'android' && NativePermissions.isAndroidNative();
  const commitmentActive = isCommitmentLockActive(commitmentLock);
  const activeAppIds = Object.values(state.appsConfig)
    .filter((config) => config.active)
    .map((config) => config.id);
  const permissionsReady = requiredPermissionsReady(state.permissions);
  const readyToAttemptStart = permissionsReady && activeAppIds.length > 0;

  const applyNativePermissionStatus = (
    nativeStatus: Awaited<ReturnType<typeof NativePermissions.getAndroidStatus>>,
  ) => {
    if (!nativeStatus) return;
    updateStateRef.current({
      permissions: {
        ...permissionsRef.current,
        ...nativeStatus,
      },
    });
  };

  const refreshNativeStatus = async (announce = true) => {
    if (!nativeAndroid) return;
    setCheckingStatus(true);
    if (announce) setStatusMessage(null);
    try {
      const [permissionStatus, protectionStatus] = await Promise.all([
        NativePermissions.getAndroidStatus(),
        NativeProtection.getStatus(),
      ]);
      applyNativePermissionStatus(permissionStatus);
      setServiceStatus(protectionStatus);
      if (announce) setStatusMessage('Android-Status wurde aktualisiert.');
    } catch (error) {
      console.error('Could not read Android protection status', error);
      if (announce) setStatusMessage('Der Android-Status konnte nicht gelesen werden.');
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (nativeAndroid) void refreshNativeStatus(false);
    // A manual refresh remains available after returning from Android settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeAndroid]);

  const openPermission = async (permission: AndroidSettingsPermission) => {
    if (!nativeAndroid) return;
    setOpeningSetting(permission);
    setStatusMessage(null);
    try {
      if (permission === 'notifications') {
        const granted = await NativePermissions.requestAndroidNotifications();
        const permissionStatus = await NativePermissions.getAndroidStatus();
        applyNativePermissionStatus(permissionStatus);
        if (granted && permissionStatus?.notifications) {
          setStatusMessage('Benachrichtigungen für den sichtbaren Schutzdienst sind aktiv.');
          return;
        }
        await NativePermissions.openAndroidSettings('notifications');
        setStatusMessage('Aktiviere App-Benachrichtigungen und den Schutzkanal in Android und prüfe danach den Status erneut.');
        return;
      }

      await NativePermissions.openAndroidSettings(permission);
      setStatusMessage('Prüfe die Einstellung in Android und tippe danach auf „Status neu prüfen“.');
    } catch (error) {
      console.error('Could not open Android permission settings', error);
      setStatusMessage('Die Android-Einstellung konnte nicht geöffnet werden.');
    } finally {
      setOpeningSetting(null);
    }
  };

  const toggleProtectionService = async () => {
    if (!NativeProtection.isAvailable()) return;
    setServiceBusy(true);
    setStatusMessage(null);
    try {
      if (serviceStatus?.running) {
        if (commitmentActive) {
          setStatusMessage(
            'Der normale App-Stopp ist während Commitment gesperrt. Regeln bleiben eingefroren; Android-Systemkontrollen und der vollständige ScrollShield-Reset bleiben als externe bzw. sichere Ausgänge verfügbar.',
          );
          return;
        }
        await NativeProtection.stop();
        const nextStatus = await NativeProtection.getStatus();
        setServiceStatus(nextStatus);
        setStatusMessage(
          nextStatus.running
            ? 'Der Stopp wurde angefordert, aber Android meldet den Schutzdienst noch als laufend. Prüfe den Status erneut.'
            : 'Der Android-Schutzdienst wurde bewusst gestoppt.',
        );
        return;
      }

      const permissionStatus = await NativePermissions.getAndroidStatus();
      applyNativePermissionStatus(permissionStatus);
      if (!permissionStatus || !requiredPermissionsReady({ ...state.permissions, ...permissionStatus })) {
        setStatusMessage('Aktiviere zuerst Nutzungszugriff, Overlay und Benachrichtigungen.');
        return;
      }

      if (activeAppIds.length === 0) {
        setStatusMessage('Wähle zuerst mindestens eine geschützte App aus.');
        return;
      }

      const unavailableAppIds = await NativeProtection.sync(state.appsConfig, state.isFocusModeActive);
      const unavailable = new Set(unavailableAppIds);
      const installedActiveAppIds = activeAppIds.filter((appId) => !unavailable.has(appId));
      if (installedActiveAppIds.length === 0) {
        setStatusMessage('Keine ausgewählte aktive App ist auf diesem Android-Gerät verfügbar. Prüfe die App-Auswahl.');
        return;
      }

      await NativeProtection.start(state.appsConfig, state.isFocusModeActive);
      const nextStatus = await NativeProtection.getStatus();
      setServiceStatus(nextStatus);
      setStatusMessage(
        nextStatus.running && nextStatus.enabled
          ? `Android-Schutz läuft für ${installedActiveAppIds.length} verfügbare App${installedActiveAppIds.length === 1 ? '' : 's'}.`
          : 'Android meldet noch keinen aktiven Schutzdienst. Prüfe den Status erneut.',
      );
    } catch (error) {
      console.error('Could not change Android protection service', error);
      setServiceStatus(await NativeProtection.getStatus().catch(() => null));
      setStatusMessage('Der Android-Schutzdienst konnte nicht gestartet oder gestoppt werden. Prüfe Zugriffe und App-Auswahl.');
    } finally {
      setServiceBusy(false);
    }
  };

  const finishOnboarding = () => {
    updateState({ hasCompletedOnboarding: true });
    navigate('dashboard');
  };

  if (state.operatingSystem === 'ios') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
        <Header title={isOnboarding ? 'Setup' : 'Berechtigungen'} onBack={() => navigate(isOnboarding ? 'onboarding' : 'settings')} />
        <section className="rounded-[2rem] border border-amber-500/30 bg-amber-500/5 p-6">
          <Info size={22} className="text-amber-400" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-zinc-100">iOS-Schutz noch nicht freigegeben</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Die aktuelle Release-Basis enthält noch keine produktionsreife iOS-Bildschirmzeit-Integration. Deshalb zeigt ScrollShield hier keine künstlichen Berechtigungsschalter an.
          </p>
        </section>
        {isOnboarding && (
          <button type="button" onClick={finishOnboarding} className="mt-6 w-full rounded-[1.5rem] bg-zinc-100 py-4 font-bold text-zinc-950">
            Zur App
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
      <Header title={isOnboarding ? 'Android-Setup' : 'Berechtigungen'} onBack={() => navigate(isOnboarding ? 'onboarding' : 'settings')} />

      <div className="space-y-5">
        <section className="rounded-[1.75rem] border border-blue-500/25 bg-blue-500/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={21} className="mt-0.5 flex-shrink-0 text-blue-400" aria-hidden="true" />
            <div>
              <h1 className="font-bold text-zinc-100">Android-Schutz einrichten</h1>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                ScrollShield braucht Nutzungszugriff, Overlay und sichtbare Benachrichtigungen für den Android-v1-Schutz. Regeln und Nutzungsdaten bleiben lokal auf dem Gerät.
              </p>
            </div>
          </div>
        </section>

        {!nativeAndroid && (
          <section className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/5 p-5">
            <h2 className="font-semibold text-amber-300">Android-Systemschutz hier nicht verfügbar</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Die Systemzugriffe und der Schutzdienst funktionieren nur in der installierten Android-App. Diese Web-/Vorschauansicht kann sie nicht simulieren.
            </p>
          </section>
        )}

        {nativeAndroid && (
          <>
            <button
              type="button"
              onClick={() => void refreshNativeStatus()}
              disabled={checkingStatus}
              className="flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-200 disabled:opacity-50"
            >
              <RefreshCw size={16} className={checkingStatus ? 'animate-spin' : ''} aria-hidden="true" />
              {checkingStatus ? 'Android-Status wird geprüft' : 'Status neu prüfen'}
            </button>

            <NativeProtectionStatusPanel
              status={serviceStatus}
              busy={serviceBusy}
              onToggle={() => void toggleProtectionService()}
              stopLocked={commitmentActive}
              stopLockedMessage={
                commitmentActive && commitmentLock
                  ? `Der normale Stopp in ScrollShield ist bis ${new Date(commitmentLock.lockedUntil).toLocaleString('de-DE')} gesperrt. Berechtigungen und ein nötiger Neustart des Schutzdienstes bleiben verfügbar.`
                  : undefined
              }
            />

            {statusMessage && (
              <p role="status" className="text-center text-xs leading-relaxed text-zinc-400">
                {statusMessage}
              </p>
            )}
          </>
        )}

        <div className="space-y-4">
          {PERMISSION_CARDS.map((card) => {
            const Icon = card.icon;
            const active = state.permissions[card.key];
            const required = !card.optional;
            return (
              <section key={card.key} className="rounded-[1.5rem] border border-zinc-800/60 bg-zinc-900/75 p-5">
                <div className="flex items-start gap-3">
                  <Icon size={20} className={active ? 'text-emerald-400' : 'text-zinc-500'} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold text-zinc-100">{card.title}</h2>
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? 'text-emerald-400' : required ? 'text-amber-400' : 'text-zinc-500'}`}>
                        {active ? 'AKTIV' : required ? 'FEHLT' : 'OPTIONAL'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{card.description}</p>
                    {!active && <p className="mt-2 text-xs leading-relaxed text-zinc-500">{card.missing}</p>}
                    {nativeAndroid && (
                      <button
                        type="button"
                        onClick={() => void openPermission(card.key)}
                        disabled={openingSetting === card.key}
                        className="mt-4 min-h-[44px] w-full rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-bold text-zinc-200 disabled:opacity-50"
                      >
                        {openingSetting === card.key
                          ? 'Wird geöffnet…'
                          : card.key === 'notifications'
                            ? 'Benachrichtigungen prüfen'
                            : 'Android-Einstellung öffnen'}
                      </button>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {isOnboarding && (
          <section className="pt-3">
            <button type="button" onClick={finishOnboarding} className="w-full rounded-[1.5rem] bg-zinc-100 py-4 font-bold text-zinc-950">
              {readyToAttemptStart ? 'Setup abschließen' : 'Setup später abschließen'}
            </button>
            <p className="mx-auto mt-3 max-w-xs text-center text-xs leading-relaxed text-zinc-500">
              {readyToAttemptStart
                ? 'Die Pflichtzugriffe und mindestens eine App sind ausgewählt. Der Schutz gilt erst als aktiv, wenn der Dienststatus ausdrücklich „AKTIV“ zeigt.'
                : 'Du kannst die App öffnen und fehlende Zugriffe später ergänzen. ScrollShield behauptet bis dahin nicht, dass der Android-Schutz aktiv ist.'}
            </p>
          </section>
        )}
      </div>
    </motion.div>
  );
}
