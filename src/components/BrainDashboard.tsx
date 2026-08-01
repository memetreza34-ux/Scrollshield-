import React from 'react';
import { BrainState, ImpulseEvent } from '../types';
import { Brain, Zap, ShieldAlert, Sparkles, Clock, Flame, Activity } from 'lucide-react';

interface BrainDashboardProps {
  brainState: BrainState;
  events: ImpulseEvent[];
  onOpenCoachingModal: (appName: string) => void;
}

export const BrainDashboard: React.FC<BrainDashboardProps> = ({
  brainState,
  events,
  onOpenCoachingModal
}) => {
  return (
    <div className="space-y-8">
      {/* Top Hero Section: Animated AI Brain Pulse */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Brain Visualizer & Neuro Score */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 glass-card rounded-2xl border border-cyan-500/20 text-center">
            <div className="relative mb-6">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-cyan-500/20 via-violet-500/20 to-emerald-500/20 flex items-center justify-center animate-brain border border-cyan-400/30">
                <Brain className="w-16 h-16 sm:w-20 sm:h-20 text-cyan-400" />
              </div>
              <div className="absolute -bottom-2 right-2 bg-slate-900/90 border border-emerald-400/40 text-emerald-400 text-xs px-3 py-1 rounded-full font-mono flex items-center gap-1.5 shadow-lg">
                <Activity className="w-3.5 h-3.5 animate-pulse" /> Live KI-Analyse
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Mindfulness Index</span>
              <div className="text-4xl sm:text-5xl font-extrabold gradient-text tracking-tight font-mono">
                {brainState.mindfulnessScore}%
              </div>
              <p className="text-xs text-slate-400 pt-1">
                {brainState.mindfulnessScore > 75 ? '🟢 Hohe mentale Klarheit & geringe Impulsanfälligkeit' : '🟡 Moderates Dopamin-Level'}
              </p>
            </div>
          </div>

          {/* Brain Key Stats & Insights */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold mb-2">
                <Sparkles className="w-4 h-4" /> KI-Neuro-Insight
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                "Dein Fokus ist heute überdurchschnittlich stabil."
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
                {brainState.insightsText}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl glass-card border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                  <Clock className="w-4 h-4" /> Eingesparte Zeit
                </div>
                <div className="text-2xl font-bold text-white font-mono">{brainState.savedTimeMinutesToday} Min.</div>
                <div className="text-[11px] text-slate-400 mt-1">durch Verlangen-Pausen</div>
              </div>

              <div className="p-4 rounded-xl glass-card border border-violet-500/20">
                <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold mb-1">
                  <ShieldAlert className="w-4 h-4" /> KI-Interventionen
                </div>
                <div className="text-2xl font-bold text-white font-mono">{brainState.totalInterventionsToday}x</div>
                <div className="text-[11px] text-slate-400 mt-1">Impulse abgefangen</div>
              </div>

              <div className="p-4 rounded-xl glass-card border border-cyan-500/20 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold mb-1">
                  <Flame className="w-4 h-4" /> Risiko-Fenster
                </div>
                <div className="text-base font-bold text-white font-mono">{brainState.topVulnerableHour}</div>
                <div className="text-[11px] text-slate-400 mt-1">Höchste Binge-Neigung</div>
              </div>
            </div>

            {/* Quick Trigger Test Button */}
            <div className="pt-2">
              <button
                onClick={() => onOpenCoachingModal('Instagram')}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all"
              >
                <Zap className="w-4 h-4" /> KI-Reflexions-Pause Testen (Instagram)
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Recent Impulse Intervention History */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Live Impuls-Protokoll</h3>
              <p className="text-xs text-slate-400">Echtzeit-Aufzeichnung abgefangener Scroll-Versuche</p>
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
            {events.length} Aufzeichnungen
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {events.map((evt) => (
            <div key={evt.id} className="p-4 rounded-xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl text-xs font-bold font-mono ${
                  evt.outcome === 'reflection_canceled' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                  evt.outcome === 'blocked' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                  'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  {evt.appName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                    {evt.appName}
                    <span className="text-[11px] text-slate-500 font-mono">um {evt.timestamp} Uhr</span>
                  </div>
                  {evt.reflectionResponse && (
                    <p className="text-xs text-slate-400 italic mt-0.5">
                      "{evt.reflectionResponse}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-300">
                    {evt.outcome === 'reflection_canceled' ? '✅ Selbst abgebrochen' :
                     evt.outcome === 'blocked' ? '🛡️ Durch KI geschützt' : '⏳ Nach Pause geöffnet'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Vulnerabilität: {evt.vulnerabilityScoreAtTime}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
