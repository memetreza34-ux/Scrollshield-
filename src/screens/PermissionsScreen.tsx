import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Eye,
  Info,
  Layers,
  RefreshCw,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { Header } from '../components/ui';
import { NativePermissions } from '../lib/nativePermissions';
import type { AppPermissions, AppState, Screen } from '../types';

type AndroidSettingKey =
  | 'usageAccess'
  | 'overlay'
  | 'notifications'
  | 'ignoreBatteryOptimization'
  | 'backgroundActivity';

interface PermissionCardSpec {
  key: keyof AppPermissions;
  icon: React.ReactNode;
  title: string;
  purpose: string[];
  limitations: string;
  details?: string;
  optional?: boolean;
  platform?: 'android' | 'ios' | 'both';
}

const isAndroidSettingKey = (key: keyof AppPermissions): key is AndroidSettingKey =>
  ['usageAccess', 'overlay', 'notifications', 'ignoreBatteryOptimization', 'backgroundActivity'].includes(key);

export function PermissionsScreen({
  state,
  updateState,
  navigate,
  isOnboarding = false,
}: {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  navigate: (screen: Screen) => void;
  isOnboarding?: boolean;
}) {
  const { operatingSystem, permissions } = state;
  const [expandedInfo, setExpandedInfo] = useState<keyof AppPermissions | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [openingSetting, setOpeningSetting] = useState<keyof AppPermissions | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const updateStateRef = useRef(updateState);
  const permissionsRef = useRef(permissions);

  updateStateRef.current = updateState;
  permissionsRef.current = permissions;

  const refreshNativeStatus = async () => {
    if (!NativePermissions.isAndroidNative()) return;

    setCheckingStatus(true);
    setStatusMessage(null);
    try {
      const nativeStatus = await NativePermissions.getAndroidStatus();
      if (!nativeStatus) return;
      updateStateRef.current({
        permissions: {
          ...permissionsRef.current,
          ...nativeStatus,
        },
      });
      setStatusMessage('Android-Status wurde aktualisiert.');
    } catch (error) {
      console.error('Could not read Android permission status', error);
      setStatusMessage('Der Android-Status konnte nicht gelesen werden.');
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (operatingSystem === 'android') void refreshNativeStatus();
    // Only re-check when the selected platform changes. A manual refresh is available after returning from settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatingSystem]);

  const togglePreviewPermission = (key: keyof AppPermissions, value?: boolean) => {
    updateState({
      permissions: {
        ...permissions,
        [key]: value ?? !permissions[key],
      },
    });
  };

  const activatePermission = async (key: keyof AppPermissions) => {
    if (operatingSystem === 'android' && NativePermissions.isAndroidNative() && isAndroidSettingKey(key)) {
      setOpeningSetting(key);
      setStatusMessage(null);
      try {
        await NativePermissions.openAndroidSettings(key);
        setStatusMessage('Erteile den Zugriff in Android und tippe danach auf „Status neu prüfen“.');
      } catch (error) {
        console.error('Could not open Android settings', error);
        setStatusMessage('Die Android-Einstellungen konnten nicht geöffnet werden.');
      } finally {
        setOpeningSetting(null);
      }
      return;
    }

    // Browser preview and the not-yet-connected iOS shell use local preview state.
    togglePreviewPermission(key);
  };

  const permissionCards: PermissionCardSpec[] = [
    {
      key: 'usageAccess',
      icon: <Eye size={24} />,
      title: 'App-Nutzungszugriff',
      platform: 'android',
      purpose: [
        'Erkennen, welche geschützte App geöffnet wurde',
        'App-Limits und Schutzabläufe auslösen',
        'Lokale Nutzungsstatistiken berechnen',
      ],
      limitations: 'ScrollShield kann nicht erkennen, wann eine geschützte App geöffnet wird.',
      details:
        'Android zeigt nur, welche App verwendet wurde und wann. ScrollShield liest keine Nachrichten, Bilder, Videos, Passwörter oder Tastatureingaben. Die ausgewerteten Nutzungsdaten bleiben lokal auf deinem Gerät.',
    },
    {
      key: 'overlay',
      icon: <Layers size={24} />,
      title: 'Hinweis über anderen Apps',
      platform: 'android',
      purpose: [
        'Bewusste Öffnungspause über einer geschützten App anzeigen',
        'Erreichte Zeitlimits sichtbar unterbrechen',
        'Notfallfreigabe direkt im Schutzbildschirm anbieten',
      ],
      limitations: 'ScrollShield kann Schutzregeln auswerten, aber keinen sichtbaren Unterbrechungsbildschirm anzeigen.',
      details:
        'Android verlangt dafür eine besondere Freigabe. ScrollShield verwendet sie ausschließlich für den eigenen Schutzbildschirm. Die Berechtigung kann jederzeit in den Android-Einstellungen entzogen werden.',
    },
    {
      key: 'notifications',
      icon: <Bell size={24} />,
      title: 'Benachrichtigungen',
      platform: 'both',
      optional: true,
      purpose: ['Fokus-Erinnerungen senden', 'Tageszusammenfassungen anzeigen', 'Vor dem Ende eines Zeitfensters warnen'],
      limitations: 'Du erhältst keine Erinnerungen, Warnhinweise oder Zusammenfassungen. Die übrigen Schutzregeln bleiben erhalten.',
    },
    {
      key: 'backgroundActivity',
      icon: <Activity size={24} />,
      title: 'Zuverlässiger Schutz im Hintergrund',
      platform: 'android',
      optional: true,
      purpose: [
        'Zeitpläne und aktive Sitzungen zuverlässig weiterführen',
        'Schutz nach Display-Aus oder App-Wechsel stabil halten',
        'Aggressive Akkuoptimierung mancher Hersteller vermeiden',
      ],
      limitations: 'Android kann ScrollShield im Hintergrund beenden; Zeitpläne und Sitzungen können dadurch ungenau werden.',
      details:
        'Die Schaltfläche öffnet die Akku-Einstellungen von Android. ScrollShield ändert dort nichts selbst. Eine Ausnahme ist besonders auf Geräten mit aggressiver Akkuoptimierung hilfreich.',
    },
    {
      key: 'screenTime',
      icon: <Settings size={24} />,
      title: 'Bildschirmzeit-Zugriff (iPhone/iPad)',
      platform: 'ios',
      purpose: ['Geschützte Apps auswählen', 'App-Limits anwenden', 'Apps während einer Fokuszeit einschränken'],
      limitations: 'ScrollShield kann Apps auf dem iPhone oder iPad noch nicht über die Bildschirmzeit-Funktion einschränken.',
      details:
        'Apple stellt dafür die Bildschirmzeit-Schnittstellen bereit. Die iOS-Nativeinbindung wird separat umgesetzt; bis dahin dient dieser Schalter nur der Produktvorschau.',
    },
  ];

  const visibleCards = permissionCards.filter(
    (card) => card.platform === 'both' || card.platform === operatingSystem,
  );

  const getStatusText = (active: boolean, optional = false) => {
    if (active) return 'AKTIV';
    return optional ? 'OPTIONAL' : 'FEHLT';
  };

  const getStatusClass = (active: boolean, optional = false) => {
    if (active) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (optional) return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
    return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
      <Header title={isOnboarding ? 'Setup' : 'Berechtigungen'} onBack={() => navigate(isOnboarding ? 'onboarding' : 'settings')} />

      <div className="space-y-6">
        <div className="text-center mb-8 -mt-2">
          {isOnboarding ? (
            <>
              <div className="w-16 h-16 bg-blue-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                <ShieldCheck size={32} className="text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">Schutzschild konfigurieren</h1>
              <p className="text-zinc-400 text-sm max-w-xs mx-auto">
                ScrollShield fragt nur Zugriffe an, die für den gewählten Schutz nötig sind. Du kannst alles später ändern.
              </p>
            </>
          ) : (
            <p className="text-zinc-400 text-sm max-w-sm mx-auto">
              Prüfe hier den echten Gerätestatus. ScrollShield aktiviert keine Android-Berechtigung ohne deine ausdrückliche Auswahl.
            </p>
          )}
        </div>

        {operatingSystem === 'android' && (
          <section className="rounded-[1.75rem] border border-blue-500/25 bg-blue-500/5 p-5" aria-labelledby="android-disclosure-title">
            <div className="flex gap-3 items-start">
              <Info size={19} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h2 id="android-disclosure-title" className="font-bold text-zinc-100 mb-1">Was ScrollShield auf Android erkennt</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Für den App-Schutz erkennt ScrollShield den Namen und Nutzungszeitpunkt geschützter Apps. Es liest keine Inhalte, Nachrichten, Passwörter oder Tastatureingaben und sendet diese Daten nicht an einen Entwickler-Server.
                </p>
              </div>
            </div>
          </section>
        )}

        {NativePermissions.isAndroidNative() && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void refreshNativeStatus()}
              disabled={checkingStatus}
              className="w-full rounded-[1.25rem] border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} className={checkingStatus ? 'animate-spin' : ''} />
              {checkingStatus ? 'Android-Status wird geprüft' : 'Status neu prüfen'}
            </button>
            {statusMessage && <p role="status" className="text-center text-xs text-zinc-400">{statusMessage}</p>}
          </div>
        )}

        <div className="space-y-6">
          {visibleCards.map((card) => {
            const active = permissions[card.key];
            const expanded = expandedInfo === card.key;
            const nativeAndroidAction =
              operatingSystem === 'android' && NativePermissions.isAndroidNative() && isAndroidSettingKey(card.key);
            const primaryLabel = active ? 'Deaktivieren' : nativeAndroidAction ? 'Systemeinstellungen öffnen' : 'Aktivieren';

            return (
              <section
                key={card.key}
                aria-labelledby={`permission-${card.key}-title`}
                className={`bg-zinc-900/80 backdrop-blur-md border ${active ? 'border-emerald-500/30' : 'border-zinc-800/50'} rounded-[2rem] overflow-hidden shadow-lg`}
              >
                <div className="p-5 border-b border-zinc-800/50">
                  <div className="flex gap-4 items-start">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 border ${active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                      {card.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-3 items-start mb-3">
                        <h2 id={`permission-${card.key}-title`} className="font-bold text-lg text-zinc-100">{card.title}</h2>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${getStatusClass(active, card.optional)}`}>
                          {getStatusText(active, card.optional)}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Zweck</h3>
                      <ul className="space-y-1.5 text-sm text-zinc-300">
                        {card.purpose.map((purpose) => (
                          <li key={purpose} className="flex gap-2 items-start">
                            <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span className="leading-snug">{purpose}</span>
                          </li>
                        ))}
                      </ul>

                      {!active && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mt-4">
                          <h3 className="text-xs font-bold text-amber-500/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <AlertTriangle size={12} /> Ohne diese Berechtigung
                          </h3>
                          <p className="text-sm text-zinc-400 leading-snug">{card.limitations}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expanded && card.details && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-zinc-950 px-5 py-4 border-b border-zinc-800/50"
                    >
                      <div className="flex gap-3 text-sm text-zinc-300 leading-relaxed">
                        <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <p>{card.details}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="p-4 bg-zinc-900/50 flex flex-wrap gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (active && !nativeAndroidAction) togglePreviewPermission(card.key, false);
                      else void activatePermission(card.key);
                    }}
                    disabled={openingSetting === card.key}
                    aria-label={`${active ? 'Deaktivieren' : nativeAndroidAction ? 'Systemeinstellungen öffnen' : 'Aktivieren'}: ${card.title}`}
                    className={`flex-1 py-3 px-4 rounded-[1.25rem] text-sm font-bold transition-all disabled:opacity-50 ${active ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'}`}
                  >
                    {openingSetting === card.key ? 'Wird geöffnet…' : primaryLabel}
                  </button>

                  {!active && (
                    <button
                      type="button"
                      onClick={() => togglePreviewPermission(card.key, false)}
                      aria-label={`Später: ${card.title}`}
                      className="px-4 py-3 rounded-[1.25rem] text-sm font-semibold bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      Später
                    </button>
                  )}

                  {card.details && (
                    <button
                      type="button"
                      onClick={() => setExpandedInfo(expanded ? null : card.key)}
                      aria-label={`${expanded ? 'Weniger Infos' : 'Mehr erfahren'}: ${card.title}`}
                      aria-expanded={expanded}
                      className={`px-4 py-3 rounded-[1.25rem] text-sm font-semibold border transition-colors ${expanded ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}
                    >
                      {expanded ? 'Weniger Infos' : 'Mehr erfahren'}
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {isOnboarding && (
          <div className="pt-8">
            <button
              type="button"
              onClick={() => {
                updateState({ hasCompletedOnboarding: true });
                navigate('dashboard');
              }}
              className="w-full bg-zinc-100 text-zinc-950 font-bold py-4 rounded-[1.5rem] active:scale-[0.98] transition-transform shadow-lg shadow-zinc-100/10"
            >
              Schutzschirm ist bereit
            </button>
            <p className="text-center text-xs text-zinc-500 mt-4 leading-relaxed max-w-xs mx-auto">
              Du kannst alle Berechtigungen jederzeit in den Einstellungen nachträglich ändern.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
