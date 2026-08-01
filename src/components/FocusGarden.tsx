import React, { useState } from 'react';
import { gamificationEngine } from '../lib/gamificationEngine';
import { Trees, Gem, Flame, Award, Sparkles, Sprout, ArrowUpRight } from 'lucide-react';

export const FocusGarden: React.FC = () => {
  const [state] = useState(gamificationEngine.getState());

  const getTreeIcon = (type: string) => {
    switch (type) {
      case 'redwood': return '🌲';
      case 'oak': return '🌳';
      case 'bamboo': return '🎋';
      default: return '🪴';
    }
  };

  return (
    <div className="space-y-8">
      {/* Opal Style Focus Score & Gem Stats Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/20 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          {/* Opal Score */}
          <div className="p-5 glass-card rounded-2xl border border-emerald-500/30 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Opal Focus Score</span>
              <div className="text-3xl font-extrabold text-white font-mono">{state.focusScore} <span className="text-sm font-normal text-slate-500">/ 1000</span></div>
              <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">Top 5% Achtsamkeit</div>
            </div>
          </div>

          {/* Gems Counter */}
          <div className="p-5 glass-card rounded-2xl border border-violet-500/30 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-violet-500/15 text-violet-400 border border-violet-500/30">
              <Gem className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Achtsamkeits-Gems</span>
              <div className="text-3xl font-extrabold text-white font-mono">{state.gems} 💎</div>
              <div className="text-[11px] text-violet-400 font-semibold mt-0.5">+25 heute gesammelt</div>
            </div>
          </div>

          {/* Streak */}
          <div className="p-5 glass-card rounded-2xl border border-amber-500/30 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Fokus Streak</span>
              <div className="text-3xl font-extrabold text-white font-mono">{state.currentStreakDays} Tage</div>
              <div className="text-[11px] text-amber-400 font-semibold mt-0.5">🔥 Neuer Rekord!</div>
            </div>
          </div>

        </div>
      </div>

      {/* Forest Garden Visualization */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Trees className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Dein Virtueller Achtsamkeits-Garten</h3>
              <p className="text-xs text-slate-400">Jede bestandene Fokus-Session lässt einen neuen Baum wachsen (Forest Engine)</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
            <Sprout className="w-4 h-4" /> {state.totalTreesPlanted} Bäume gepflanzt
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {state.trees.map((t) => (
            <div key={t.id} className="p-5 rounded-2xl glass-card border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-center text-3xl shadow-inner">
                  {getTreeIcon(t.type)}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{t.name}</h4>
                  <div className="text-[11px] text-slate-400 font-mono">Pflanzung: {t.plantedAt}</div>
                  <div className="flex items-center gap-1 text-[11px] text-violet-400 font-semibold mt-1">
                    <Gem className="w-3.5 h-3.5" /> +{t.gemsEarned} Gems
                  </div>
                </div>
              </div>

              <div className="text-right">
                {t.isFullyGrown ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ausgewachsen
                  </span>
                ) : (
                  <div className="text-xs text-cyan-400 font-mono font-bold">
                    {t.growthProgress}% Wuchs
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
