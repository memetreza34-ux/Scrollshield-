import React, { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Eye,
  Layers,
  Bell,
  Activity,
  CheckCircle2,
  Settings,
  AlertTriangle,
  Info,
  Film,
} from 'lucide-react';
import { AppState, Screen, AppPermissions } from '../types';
import { Header } from '../components/ui';
import { AccessibilityDisclosure } from '../components/AccessibilityDisclosure';
import { ScrollShieldBridge } from '../lib/nativeBridge';
import { requestNotificationPermission } from '../lib/notifications';
import { FEATURE_FLAGS } from '../config/featureFlags';

export function PermissionsScreen({
  state,
  updateState,
  navigate,
  isOnboarding = false,
}: {
  state: AppState;
  updateState: (u: Partial<AppState> | ((previous: AppState) => Partial<AppState>)) => void;
  navigate: (s: Screen) => void;
  isOnboarding?: boolean;
}) {
  const { permissions, operatingSystem } = state;
  const [expandedInfo, setExpandedInfo] = useState<keyof AppPermissions | null>(null);
  const [isNative, setIsNative] = useState(false);
  const [showAccessibilityDisclosure, setShowAccessibilityDisclosure] = useState(false);

  const togglePermission = (key: keyof AppPermissions, forceState?: boolean) => {
    updateState({
      permissions: {
        ...permissions,
        [key]: forceState !== undefined ? forceState : !permissions[key],
      },
    });
  };

  /**
   * Reads the permissions the operating system actually granted. Without this
   * the screen only ever showed what the user tapped in ScrollShield, which
   * could claim "AKTIV" while Android had granted nothing.
   */
  const refreshNativeStatus = useCallback(async () => {
    // The web fallback reports everything as false; applying it would wipe the
    // switches of the browser demo on every tab change.
    if (!Capacitor.isNativePlatform()) return;

    try {
      const status = await ScrollShieldBridge.getPermissionStatus();
      setIsNative(true);

      // Merged into the latest state, not the one this callback was created
      // with: otherwise every return from a settings screen would reset the
      // switches that only exist in ScrollShield (e.g. background activity).
      updateState((previous) => ({
        permissions: {
          ...previous.permissions,
          usageAccess: status.usageStats,
          overlay: status.overlay,
          notifications: status.notifications,
          accessibility: status.accessibility,
          backgroundActivity: status.batteryOptimizationIgnored ?? previous.permissions.backgroundActivity,
          ignoreBatteryOptimization:
            status.batteryOptimizationIgnored ?? previous.permissions.ignoreBatteryOptimization,
        },
      }));
    } catch {
      // Plugin not available on this platform – keep the locally stored switches.
    }
  }, [updateState]);

  useEffect(() => {
    void refreshNativeStatus();
  }, [refreshNativeStatus]);

  // Android sends the user to a system settings screen; pick the result up when
  // they come back.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshNativeStatus();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshNativeStatus]);

  const openAccessibilitySettings = () => {
    setShowAccessibilityDisclosure(false);
    void ScrollShieldBridge.openAccessibilitySettings().catch(() => undefined);
  };

  /**
   * Opens the matching system settings screen; Android grants none of these
   * programmatically. The status shown afterwards is what Android reports on
   * return – never a local switch, which used to say "AKTIV" for a permission
   * the system had not granted.
   */
  const requestPermission = async (key: keyof AppPermissions) => {
    // Google Play requires the disclosure and an explicit "yes" before the
    // service is switched on; managing a running one needs neither.
    if (key === 'accessibility') {
      if (permissions.accessibility) openAccessibilitySettings();
      else setShowAccessibilityDisclosure(true);
      return;
    }

    try {
      // Notifications are a browser-level permission, not a system settings screen.
      if (key === 'notifications') {
        const granted = await requestNotificationPermission();
        togglePermission(key, granted);
        return;
      }

      if (key === 'usageAccess') await ScrollShieldBridge.requestUsageStatsPermission();
      else if (key === 'overlay') await ScrollShieldBridge.requestOverlayPermission();
      else if (key === 'backgroundActivity') await ScrollShieldBridge.openBatteryOptimizationSettings();
    } catch {
      // Plugin unavailable; the status stays as Android reports it.
    }
  };

  const getStatusText = (isActive: boolean, isOptional: boolean = false) => {
    if (isActive) return 'AKTIV';
    if (isOptional) return 'OPTIONAL';
    return 'FEHLT';
  };

  const getStatusColor = (isActive: boolean, isOptional: boolean = false) => {
    if (isActive) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (isOptional) return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
    return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
  };

  const renderPermissionCard = (
    key: keyof AppPermissions,
    icon: React.ReactNode,
    title: string,
    purpose: string[],
    limitations: string,
    isOptional = false,
    isIosOnly = false,
    isAndroidOnly = false,
    detailedExplanation?: string,
  ) => {
    if (isIosOnly && operatingSystem !== 'ios') return null;
    if (isAndroidOnly && operatingSystem !== 'android') return null;

    const isActive = permissions[key];
    const isExpanded = expandedInfo === key;

    return (
      <section
        aria-labelledby={`permission-${key}-title`}
        className={`bg-zinc-900/80 backdrop-blur-md border ${isActive ? 'border-emerald-500/30' : 'border-zinc-800/50'} rounded-[2rem] overflow-hidden transition-all shadow-lg`}
      >
        <div className="p-5 border-b border-zinc-800/50">
          <div className="flex gap-4 items-start">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 ${isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 border border-zinc-700 text-zinc-400'}`}
            >
              {icon}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h2 id={`permission-${key}-title`} className="font-bold text-lg text-zinc-100">
                  {title}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${getStatusColor(isActive, isOptional)}`}
                >
                  {getStatusText(isActive, isOptional)}
                </span>
              </div>

              <div className="mb-4 mt-3 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Zweck</h3>
                  <ul className="space-y-1.5 text-sm text-zinc-300">
                    {purpose.map((p, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="leading-snug">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {!isActive && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                    <h3 className="text-xs font-bold text-amber-500/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Ohne diese Berechtigung
                    </h3>
                    <p className="text-sm text-zinc-400 leading-snug">{limitations}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && detailedExplanation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-950 px-5 py-4 border-b border-zinc-800/50"
            >
              <div className="flex gap-3 text-sm text-zinc-300">
                <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 leading-relaxed whitespace-pre-line">{detailedExplanation}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 bg-zinc-900/50 flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => void requestPermission(key)}
            aria-label={`${isActive ? 'In Systemeinstellungen verwalten' : 'Aktivieren'}: ${title}`}
            className={`flex-1 py-3 px-4 rounded-[1.25rem] text-sm font-bold transition-all ${isActive ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'}`}
          >
            {isActive ? (isNative ? 'In Einstellungen verwalten' : 'Deaktivieren') : 'Aktivieren'}
          </button>

          {!isActive && (
            <button
              onClick={() => togglePermission(key, false)}
              aria-label={`Später: ${title}`}
              className="px-4 py-3 rounded-[1.25rem] text-sm font-semibold bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Später
            </button>
          )}

          {detailedExplanation && (
            <button
              onClick={() => setExpandedInfo(isExpanded ? null : key)}
              aria-label={`${isExpanded ? 'Weniger Infos' : 'Mehr erfahren'}: ${title}`}
              aria-expanded={isExpanded}
              className={`px-4 py-3 rounded-[1.25rem] text-sm font-semibold border transition-colors ${isExpanded ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}
            >
              {isExpanded ? 'Weniger Infos' : 'Mehr erfahren'}
            </button>
          )}
        </div>
      </section>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
      {showAccessibilityDisclosure && (
        <AccessibilityDisclosure
          onAccept={openAccessibilitySettings}
          onDecline={() => setShowAccessibilityDisclosure(false)}
        />
      )}
      <Header
        title={isOnboarding ? 'Setup' : 'Berechtigungen'}
        onBack={() => navigate(isOnboarding ? 'onboarding' : 'settings')}
      />

      <div className="space-y-6">
        <div className="text-center mb-8 -mt-2">
          {!isOnboarding ? (
            <p className="text-zinc-400 text-sm max-w-sm mx-auto">
              Verwalte, welche Funktionen deines Geräts ScrollShield verwenden darf. Du behältst jederzeit die volle
              Kontrolle.
            </p>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                <ShieldCheck size={32} className="text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Schutzschild konfigurieren</h2>
              <p className="text-zinc-400 text-sm max-w-xs mx-auto">
                ScrollShield benötigt ausgewählte Zugriffe, um dich schützen zu können. Bitte lies genau durch, warum
                wir welche Berechtigung brauchen.
              </p>
            </>
          )}
        </div>

        {operatingSystem === 'web' && (
          <section
            aria-labelledby="permissions-web-note"
            className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5"
          >
            <h2 id="permissions-web-note" className="mb-2 font-bold text-zinc-100">
              Du nutzt die Webversion
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Ein Browser kann andere Apps weder erkennen noch sperren. Systemberechtigungen gibt es deshalb erst in der
              Android-App. Regeln, Fokuszeiten, Verlauf und Statistiken funktionieren hier vollständig.
            </p>
          </section>
        )}

        <div className="space-y-6">
          {renderPermissionCard(
            'usageAccess',
            <Eye size={24} />,
            'App-Nutzungszugriff',
            [
              'Erkennen, welche geschützte App geöffnet wurde',
              'Timer und App-Limits ermöglichen',
              'Statistiken für dich berechnen',
            ],
            'Die App kann nicht feststellen, wann du z.B. Instagram öffnest, und der Schutz kann nicht ausgelöst werden.',
            false,
            false,
            true,
            'Warum wird das gebraucht?\nScrollShield muss erkennen, wann eine geschützte App geöffnet wird. Android stellt dafür den Nutzungszugriff bereit.\n\nWas wir nicht tun:\nWir lesen keine Bildschirminhalte. Wir protokollieren nicht, was du in den Apps machst. Wir senden keine Nutzungsdaten an Entwickler-Server.',
          )}

          {renderPermissionCard(
            'notifications',
            <Bell size={24} />,
            'Benachrichtigungen',
            [
              'Fokus-Erinnerungen senden',
              'Tageszusammenfassungen anzeigen',
              'Warnungen bei kritischen Rückfallmustern',
            ],
            'Du erhältst keine Erinnerungen, Warnhinweise als Mitteilung oder Zusammenfassungen. Die übrigen Schutzregeln bleiben erhalten.',
            true,
            false,
            false,
          )}

          {renderPermissionCard(
            'overlay',
            <Layers size={24} />,
            'Hinweis über anderen Apps',
            [
              'Unterbrechungsbildschirm über einer geschützten App anzeigen',
              'Zeitlimit erreicht anzeigen',
              'Sicherstellen, dass der Warnhinweis immer sichtbar ist',
            ],
            'ScrollShield kann weiterhin erinnern und Aktivitäten lokal erfassen, aber keinen Hinweis über einer anderen App anzeigen.',
            false,
            false,
            true,
          )}

          {FEATURE_FLAGS.enableShortVideoResearch &&
            renderPermissionCard(
              'accessibility',
              <Film size={24} />,
              'Kurzvideo-Erkennung (Bedienungshilfe)',
              [
                'Erkennen, ob gerade Reels, Shorts oder der TikTok-Feed offen ist',
                'Deine Wischbewegungen im Feed zählen',
                'Feed-Limits und Wisch-Unterbrechungen ermöglichen',
              ],
              'App-Limits und Verzögerungen funktionieren weiter. Regeln, die sich nur auf den Kurzvideo-Feed beziehen (Tageslimit für Reels, Stopp nach X Wischern), bleiben wirkungslos.',
              true,
              false,
              true,
              'Was der Dienst liest:\nNur technische Kennungen der angezeigten Oberfläche (Bezeichner von Bildschirmelementen). Daran erkennt ScrollShield, ob ein Kurzvideo-Feed offen ist.\n\nWas der Dienst NICHT liest:\nKeine Texte, keine Nachrichten, keine Passwörter, keine Sucheingaben, keine Bildschirminhalte. Diese Funktionen sind im Code nicht vorhanden.\n\nWohin die Daten gehen:\nNirgendwohin. Zähler und Zeiten bleiben verschlüsselt auf deinem Gerät. ScrollShield hat keinen Server.\n\nDu kannst den Dienst jederzeit in den Android-Einstellungen wieder abschalten.',
            )}

          {renderPermissionCard(
            'screenTime',
            <Settings size={24} />,
            'Bildschirmzeit-Zugriff (iPhone/iPad)',
            ['Geschützte Apps auswählen', 'App-Limits anwenden', 'Apps während einer Fokuszeit einschränken'],
            'ScrollShield kann Apps auf dem iPhone oder iPad nicht über die Bildschirmzeit-Funktion einschränken.',
            false,
            true, // iOS only
            false,
            'Apple stellt dafür die Bildschirmzeit-Schnittstelle bereit. ScrollShield erhält nur die für Auswahl und Limits nötigen Informationen, nicht den Inhalt anderer Apps.',
          )}

          {!isOnboarding &&
            renderPermissionCard(
              'backgroundActivity',
              <Activity size={24} />,
              'Zuverlässiger Schutz im Hintergrund',
              [
                'Timer für App-Nutzung stabil weiterführen',
                'Limits sauber überwachen, auch wenn das Display zwischendurch aus (oder im Hintergrund) war',
                'Verhindert, dass das Handy die App "schlafen" legt',
              ],
              'Timer können ungenau werden oder pausieren, wenn das Gerät ScrollShield im Hintergrund beendet.',
              true, // optional
              false,
              true,
              'Einige Geräte beenden Apps im Hintergrund besonders schnell, um Akku zu sparen. Prüfe diese Einstellung nur, wenn ScrollShield auf deinem Gerät unerwartet stoppt; sie ist für die Ersteinrichtung nicht erforderlich.',
            )}
        </div>

        {isOnboarding && (
          <div className="pt-8">
            <button
              onClick={() => {
                updateState({ hasCompletedOnboarding: true });
                navigate('today');
              }}
              className="w-full bg-zinc-100 text-zinc-950 font-bold py-4 rounded-[1.5rem] active:scale-[0.98] transition-transform shadow-lg shadow-zinc-100/10"
            >
              Schutzschirm ist bereit
            </button>
            <p className="text-center text-xs text-zinc-500 mt-4 leading-relaxed max-w-xs mx-auto">
              Keine Sorge: Du kannst alle Berechtigungen jederzeit in den Einstellungen nachträglich ändern.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
