import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { ShieldCheck, Eye, Layers, Bell, Activity, CheckCircle2, Settings, AlertTriangle, Info } from 'lucide-react';
import { AppState, Screen, AppPermissions } from '../types';
import { Header } from '../components/ui';

export function PermissionsScreen({
  state,
  updateState,
  navigate,
  isOnboarding = false,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
  isOnboarding?: boolean;
}) {
  const { permissions, operatingSystem } = state;
  const [expandedInfo, setExpandedInfo] = useState<keyof AppPermissions | null>(null);

  const togglePermission = (key: keyof AppPermissions, forceState?: boolean) => {
    updateState({
      permissions: {
        ...permissions,
        [key]: forceState !== undefined ? forceState : !permissions[key],
      },
    });
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
            onClick={() => togglePermission(key)}
            aria-label={`${isActive ? 'Deaktivieren' : 'Aktivieren'}: ${title}`}
            className={`flex-1 py-3 px-4 rounded-[1.25rem] text-sm font-bold transition-all ${isActive ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'}`}
          >
            {isActive ? 'Deaktivieren' : 'Aktivieren'}
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

  if (!Capacitor.isNativePlatform()) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
        <Header title="Berechtigungen" onBack={() => navigate(isOnboarding ? 'onboarding' : 'settings')} />
        <section className="mt-5 rounded-[2rem] border border-zinc-700 bg-zinc-900/80 p-6">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <ShieldCheck size={25} aria-hidden="true" />
          </div>
          <h1 className="mb-3 text-2xl font-bold text-zinc-100">Im Browser ohne Gerätezugriff</h1>
          <p className="text-[15px] leading-relaxed text-zinc-300">
            ScrollShield kann hier weder Bildschirmzeit-Berechtigungen anfordern noch andere Apps erkennen oder sperren.
            Fokuszeit, Ziele und bewusste Pausen kannst du trotzdem nutzen.
          </p>
        </section>
        <button
          onClick={() => {
            if (isOnboarding) updateState({ hasCompletedOnboarding: true });
            navigate(isOnboarding ? 'dashboard' : 'settings');
          }}
          className="mt-6 w-full rounded-2xl bg-emerald-400 px-5 py-4 font-bold text-zinc-950"
        >
          {isOnboarding ? 'App einrichten' : 'Zurück zu Einstellungen'}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
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

          {renderPermissionCard(
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
            'Einige Geräte beenden Apps im Hintergrund besonders schnell, um Akku zu sparen. Eine Ausnahme in den Akku-Einstellungen sorgt dafür, dass Timer und Schutzregeln zuverlässig weiterlaufen.',
          )}
        </div>

        {isOnboarding && (
          <div className="pt-8">
            <button
              onClick={() => {
                updateState({ hasCompletedOnboarding: true });
                navigate('dashboard');
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
