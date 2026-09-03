import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Clock, Lock, Shield } from 'lucide-react';
import { AppState, HistoryEvent, Screen, SUPPORTED_APPS } from '../types';
import { createEventId } from '../lib/appUtils';
import { countEmergencyUnlocksToday, evaluateProtectionAttempt, ProtectionFlowStep } from '../lib/protectionRules';
import { recordProtectionEventStats } from '../lib/session';

const EMERGENCY_REASONS = ['Dringende Nachricht', 'Wichtiger Post / Upload', 'Kurz etwas recherchieren'];

export function ProtectionFlow({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const appId = state.simulatedAppToOpen;
  const appInfo = SUPPORTED_APPS.find((app) => app.id === appId);
  const config = state.appsConfig[appId || ''];

  const [step, setStep] = useState<ProtectionFlowStep>('init');
  const [delayRemaining, setDelayRemaining] = useState(0);
  const [intentReason, setIntentReason] = useState('');
  const [intentDuration, setIntentDuration] = useState(5);
  const [sessionLimitOverrideMinutes, setSessionLimitOverrideMinutes] = useState<number | undefined>();

  const logEvent = useCallback(
    (type: HistoryEvent['type'], desc: string, metadata?: HistoryEvent['metadata']) => {
      if (!appId) return;

      const newEvent: HistoryEvent = {
        id: createEventId(),
        timestamp: Date.now(),
        type,
        appId,
        desc,
        ...(metadata ? { metadata } : {}),
      };
      updateState({
        history: [newEvent, ...state.history],
        dailyStats: recordProtectionEventStats(state.dailyStats, type, newEvent.timestamp),
      });
    },
    [appId, state.dailyStats, state.history, updateState],
  );

  const openApp = useCallback(
    (durationOverride?: number, reason?: string) => {
      setSessionLimitOverrideMinutes(durationOverride);

      // The stated intention used to be discarded the moment the app opened.
      // Keeping it is what makes the question more than a formality: it turns
      // up in the history and feeds the "why do you open this" insight.
      const trimmedReason = reason?.trim();
      logEvent(
        'open',
        trimmedReason ? `App geöffnet: ${trimmedReason}` : 'App geöffnet',
        trimmedReason ? { intentReason: trimmedReason, intentDurationMinutes: durationOverride } : undefined,
      );
      setStep('app_opened');
    },
    [logEvent],
  );

  const cancel = () => {
    updateState({ simulatedAppToOpen: null });
    navigate('dashboard');
  };

  useEffect(() => {
    if (!appId || !appInfo || !config) {
      navigate('dashboard');
      return;
    }

    if (step !== 'init') return;

    const decision = evaluateProtectionAttempt({
      appId,
      config,
      dailyStats: state.dailyStats,
      history: state.history,
      isFocusModeActive: state.isFocusModeActive,
    });

    if (decision.delaySeconds !== undefined) {
      setDelayRemaining(decision.delaySeconds);
    }

    if (decision.event) {
      logEvent(decision.event.type, decision.event.desc);
    }

    if (decision.step === 'app_opened') {
      openApp();
      return;
    }

    setStep(decision.step);
  }, [
    appId,
    appInfo,
    config,
    logEvent,
    navigate,
    openApp,
    state.dailyStats,
    state.history,
    state.isFocusModeActive,
    step,
  ]);

  useEffect(() => {
    if ((step !== 'standard_delay' && step !== 'emergency_countdown') || delayRemaining <= 0) return;

    const interval = setInterval(() => setDelayRemaining((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [step, delayRemaining]);

  if (!appInfo || !config) return null;

  const renderAppIcon = (sizeClass = 'w-24 h-24', textClass = 'text-5xl') => (
    <div
      className={`${sizeClass} ${appInfo.color} rounded-[2rem] mx-auto flex items-center justify-center ${textClass} shadow-2xl shadow-black/50 border border-zinc-800/50`}
    >
      {appInfo.icon}
    </div>
  );

  const renderIosFallbackInfo = () => {
    if (state.operatingSystem !== 'ios') return null;

    return (
      <div className="absolute top-6 left-6 right-6 bg-blue-500/10 border border-blue-500/20 rounded-[1.5rem] p-4 flex gap-3 text-left backdrop-blur-md z-10">
        <AlertTriangle className="text-blue-400 flex-shrink-0 mt-0.5" size={18} />
        <div>
          <h4 className="font-bold text-xs text-blue-400 mb-0.5 uppercase tracking-widest">iOS Simulation</h4>
          <p className="text-xs text-blue-300/80 leading-relaxed">
            Auf iOS wird dieser Bildschirm als Time-Sensitive-Benachrichtigung angezeigt, da direkte Overlays nicht
            erlaubt sind. Alternativ greift die Screen Time API.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      {renderIosFallbackInfo()}

      {step === 'soft_intent' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
          <div className="mb-8">{renderAppIcon()}</div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Kurzer Check</h2>
          <p className="text-zinc-400 mb-10 text-lg">Warum moechtest du {appInfo.name} öffnen?</p>

          <div className="space-y-6 mb-10 text-left">
            <div>
              <label className="text-sm font-semibold text-zinc-500 mb-3 block uppercase tracking-widest">
                Dein Grund
              </label>
              <input
                type="text"
                value={intentReason}
                onChange={(event) => setIntentReason(event.target.value)}
                placeholder="z.B. Nachricht von Anna checken"
                className="w-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5 text-zinc-100 focus:outline-none focus:border-zinc-600 shadow-inner"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">Wie lange?</label>
                <span className="text-zinc-300 font-mono bg-zinc-800/50 px-3 py-1 rounded-lg text-sm">
                  {intentDuration} Min
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={intentDuration}
                onChange={(event) => setIntentDuration(Number(event.target.value))}
                className="w-full accent-zinc-200"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={cancel}
              className="flex-1 py-4 rounded-[1.5rem] font-semibold bg-zinc-900/80 backdrop-blur-md text-zinc-300 border border-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={() => openApp(intentDuration, intentReason)}
              className="flex-1 py-4 rounded-[1.5rem] font-bold bg-zinc-100 text-zinc-950 shadow-lg shadow-zinc-100/10 active:scale-[0.98] transition-transform"
            >
              Weiter
            </button>
          </div>
        </motion.div>
      )}

      {step === 'standard_delay' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-sm flex flex-col items-center"
        >
          <div className="relative w-40 h-40 flex items-center justify-center mb-10">
            <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-lg">
              <circle cx="80" cy="80" r="76" fill="none" stroke="#27272a" strokeWidth="6" />
              <motion.circle
                cx="80"
                cy="80"
                r="76"
                fill="none"
                stroke="#f4f4f5"
                strokeWidth="6"
                strokeLinecap="round"
                initial={{ strokeDasharray: '477', strokeDashoffset: '0' }}
                animate={{ strokeDashoffset: 477 - 477 * (delayRemaining / Math.max(1, config.openDelay)) }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </svg>
            <span className="text-5xl font-bold font-mono tracking-tighter">{delayRemaining}</span>
          </div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Durchatmen</h2>
          <p className="text-zinc-400 mb-10 text-lg">Brauchst du {appInfo.name} jetzt wirklich?</p>

          <div className="w-full flex flex-col gap-4">
            <button
              onClick={cancel}
              className="w-full py-4 rounded-[1.5rem] font-bold bg-zinc-100 text-zinc-950 shadow-lg shadow-zinc-100/10 active:scale-[0.98] transition-transform"
            >
              App schließen
            </button>
            <button
              onClick={() => openApp()}
              disabled={delayRemaining > 0}
              className={`w-full py-4 rounded-[1.5rem] font-semibold transition-all ${delayRemaining > 0 ? 'bg-zinc-900/50 text-zinc-600 border border-zinc-800/30' : 'bg-zinc-900/80 backdrop-blur-md text-zinc-300 border border-zinc-800/50 hover:bg-zinc-800'}`}
            >
              Trotzdem öffnen
            </button>
          </div>
        </motion.div>
      )}

      {step === 'strict_blocked' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
          <div className="w-24 h-24 bg-red-950/20 border border-red-900/30 rounded-[2rem] mx-auto mb-8 flex items-center justify-center shadow-lg shadow-red-900/10">
            <Lock size={40} className="text-red-500 drop-shadow-md" />
          </div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Blockiert</h2>
          <p className="text-zinc-400 mb-10 text-lg leading-relaxed">
            {state.isFocusModeActive
              ? `${appInfo.name} ist während deiner Fokus-Sitzung gesperrt.`
              : `${appInfo.name} ist aktuell durch deine strengen Regeln gesperrt.`}
          </p>

          <div className="w-full flex flex-col gap-4">
            <button
              onClick={cancel}
              className="w-full py-4 rounded-[1.5rem] font-bold bg-zinc-100 text-zinc-950 shadow-lg shadow-zinc-100/10 active:scale-[0.98] transition-transform"
            >
              Verstanden
            </button>
            {(config.emergencyUnlock?.enabled || state.isFocusModeActive) && (
              <button
                onClick={() => {
                  setStep('emergency_countdown');
                  setDelayRemaining(state.isFocusModeActive ? 30 : 10);
                }}
                className={`w-full py-4 rounded-[1.5rem] font-semibold backdrop-blur-md border transition-colors ${state.isFocusModeActive ? 'bg-red-950/30 text-red-500 border-red-900/50 hover:bg-red-900/30' : 'bg-amber-950/20 text-amber-500/80 border-amber-900/30 hover:bg-amber-950/40'}`}
              >
                Notfallfreigabe anfordern
              </button>
            )}
          </div>
        </motion.div>
      )}

      {step === 'emergency_countdown' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-sm">
          <div className="w-24 h-24 bg-amber-950/20 border border-amber-900/30 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-lg shadow-amber-900/10">
            <AlertTriangle size={40} className="text-amber-500 drop-shadow-md" />
          </div>
          <h2 className="text-3xl font-bold mb-2 tracking-tight">Notfallfreigabe</h2>
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 mb-8 text-left">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-zinc-800/50">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${appInfo.color}`}>
                {appInfo.icon}
              </div>
              <div>
                <div className="font-semibold text-zinc-200">{appInfo.name}</div>
                <div className="text-xs text-zinc-500">
                  Gesperrt durch: {state.isFocusModeActive ? 'Fokus-Sitzung' : 'Strikte Regel'}
                </div>
              </div>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed mb-3">
              Bitte warte <span className="font-mono font-bold text-amber-400">{delayRemaining}</span> Sekunden. Nutze
              diese Zeit, um zu prüfen, ob du die App jetzt wirklich brauchst.
            </p>
            {(() => {
              const emergencyCountToday = countEmergencyUnlocksToday(state.history);
              const remaining = Math.max(0, (config.emergencyUnlock?.maxPerDay ?? 0) - emergencyCountToday);
              return (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                  <Shield size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-amber-400/90 font-medium">
                    Du hast heute noch {remaining} Notfallfreigabe{remaining !== 1 ? 'n' : ''} übrig. Bei Missbrauch
                    wird die App für {config.antiBinge.blockTimeframe} Min. komplett gesperrt.
                  </span>
                </div>
              );
            })()}
          </div>

          <button
            onClick={cancel}
            className="w-full py-4 rounded-[1.5rem] font-bold bg-zinc-100 text-zinc-950 mb-4 shadow-lg shadow-zinc-100/10 active:scale-[0.98] transition-transform"
          >
            Abbrechen
          </button>
          <button
            onClick={() => setStep('emergency_reason')}
            disabled={delayRemaining > 0}
            className={`w-full py-4 rounded-[1.5rem] font-semibold transition-all ${delayRemaining > 0 ? 'bg-zinc-900/50 text-zinc-600 border border-zinc-800/30' : 'bg-amber-950/30 text-amber-500 border border-amber-900/50 hover:bg-amber-900/30'}`}
          >
            Weiter zur Freigabe
          </button>
        </motion.div>
      )}

      {step === 'emergency_reason' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-sm text-left">
          <h2 className="text-2xl font-bold mb-2 tracking-tight">Bewusste Freigabe</h2>
          <p className="text-zinc-400 mb-6 text-sm">Warum musst du {appInfo.name} jetzt öffnen?</p>

          <div className="space-y-2 mb-6">
            {EMERGENCY_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setIntentReason(reason)}
                className={`w-full p-4 rounded-xl text-sm font-medium text-left transition-colors border ${intentReason === reason ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-zinc-900/80 border-zinc-800/50 text-zinc-300 hover:bg-zinc-800'}`}
              >
                {reason}
              </button>
            ))}
            <input
              type="text"
              value={!EMERGENCY_REASONS.includes(intentReason) ? intentReason : ''}
              onChange={(event) => setIntentReason(event.target.value)}
              onFocus={() => {
                if (EMERGENCY_REASONS.includes(intentReason)) setIntentReason('');
              }}
              placeholder="Anderer Grund..."
              className={`w-full p-4 rounded-xl text-sm font-medium text-left transition-colors border focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${!EMERGENCY_REASONS.includes(intentReason) && intentReason ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-zinc-900/80 border-zinc-800/50 text-zinc-300'}`}
            />
          </div>

          <div className="mb-8">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 block">
              Dauer der Freigabe
            </label>
            <div className="flex gap-2">
              {[2, 5, 10].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setIntentDuration(mins)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${intentDuration === mins ? 'bg-zinc-800 border-zinc-600 text-zinc-100' : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:bg-zinc-800'}`}
                >
                  {mins} Min
                </button>
              ))}
            </div>
            {state.isFocusModeActive && (
              <p className="text-[10px] text-amber-500/80 mt-3 flex items-center gap-1.5">
                <AlertTriangle size={12} /> Warnung: Deine Fokus-Sitzung wird währenddessen pausiert.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={cancel}
              className="flex-1 py-4 rounded-[1.5rem] font-semibold bg-zinc-900/80 backdrop-blur-md text-zinc-300 border border-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              disabled={!intentReason}
              onClick={() => {
                logEvent('emergency', `Notfallfreigabe (${intentDuration}m): ${intentReason}`);
                setSessionLimitOverrideMinutes(intentDuration);
                setStep('app_opened');
              }}
              className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-[1.5rem] font-bold shadow-lg transition-all ${!intentReason ? 'bg-zinc-800 text-zinc-500' : 'bg-amber-500 text-amber-950 shadow-amber-500/20 active:scale-[0.98]'}`}
            >
              <AlertTriangle size={16} className={!intentReason ? 'opacity-50' : ''} /> Entsperren
            </button>
          </div>
        </motion.div>
      )}

      {step === 'anti_binge_warning' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
          <div className="w-24 h-24 bg-orange-950/20 border border-orange-900/30 rounded-[2rem] mx-auto mb-8 flex items-center justify-center shadow-lg shadow-orange-900/10">
            <Clock size={40} className="text-orange-500 drop-shadow-md" />
          </div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Anti-Binge Warnung</h2>
          <p className="text-zinc-400 mb-10 text-lg leading-relaxed">
            Du hast {appInfo.name} in letzter Zeit sehr oft geöffnet. Versuchst du gerade, Langeweile zu bekämpfen?
          </p>

          <div className="w-full flex flex-col gap-4">
            <button
              onClick={cancel}
              className="w-full py-4 rounded-[1.5rem] font-bold bg-zinc-100 text-zinc-950 shadow-lg shadow-zinc-100/10 active:scale-[0.98] transition-transform"
            >
              Besser nicht öffnen
            </button>
            <button
              onClick={() => setStep(config.mode === 'standard' ? 'standard_delay' : 'soft_intent')}
              className="w-full py-4 rounded-[1.5rem] font-semibold bg-zinc-900/80 backdrop-blur-md text-zinc-400 border border-zinc-800/50 hover:text-zinc-300 transition-colors"
            >
              Trotzdem weiter
            </button>
          </div>
        </motion.div>
      )}

      {step === 'anti_binge_block' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
          <div className="w-24 h-24 bg-red-950/20 border border-red-900/30 rounded-[2rem] mx-auto mb-8 flex items-center justify-center shadow-lg shadow-red-900/10">
            <Shield size={40} className="text-red-500 drop-shadow-md" />
          </div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Schutz-Sperre</h2>
          <p className="text-zinc-400 mb-10 text-lg leading-relaxed">
            Du hast {appInfo.name} zu oft geöffnet oder zu viele Notfallfreigaben genutzt. Die App ist nun zu deinem
            eigenen Schutz für{' '}
            <span className="font-mono font-bold text-zinc-200">{config.antiBinge.blockTimeframe}</span> Minuten strikt
            eingeschränkt.
          </p>

          <button
            onClick={cancel}
            className="w-full py-4 rounded-[1.5rem] font-bold bg-zinc-100 text-zinc-950 shadow-lg shadow-zinc-100/10 active:scale-[0.98] transition-transform"
          >
            Verstanden
          </button>
        </motion.div>
      )}

      {step === 'app_opened' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-sm">
          <div className="mb-10">{renderAppIcon('w-32 h-32', 'text-6xl')}</div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight">{appInfo.name} ist offen</h2>
          <div className="text-zinc-400 mb-10 text-lg leading-relaxed space-y-2">
            <p>Dein Zeitlimit läuft.</p>
          </div>

          <button
            onClick={() => {
              updateState({
                simulatedAppToOpen: null,
                activeSession: {
                  appId: appInfo.id,
                  startTime: Date.now(),
                  extensionCount: 0,
                  isPaused: false,
                  sessionLimitOverride: sessionLimitOverrideMinutes,
                },
              });
              navigate('active_session');
            }}
            className="w-full py-4 rounded-[1.5rem] font-bold bg-zinc-100 text-zinc-950 shadow-lg shadow-zinc-100/10 active:scale-[0.98] transition-transform mb-4"
          >
            Zur App wechseln
          </button>

          <button
            onClick={cancel}
            className="w-full py-4 rounded-[1.5rem] font-semibold bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Doch nicht öffnen
          </button>
        </motion.div>
      )}
    </div>
  );
}
