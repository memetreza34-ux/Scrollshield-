import React, { useState } from 'react';
import { habiticaEngine } from '../lib/habiticaGuildEngine';
import { Swords, Shield, Skull, Award, Zap, Heart } from 'lucide-react';

export const HabiticaBossPanel: React.FC = () => {
  const [boss, setBoss] = useState(habiticaEngine.getBossState());

  const handleTestAttack = () => {
    habiticaEngine.attackBoss(50);
    setBoss({ ...habiticaEngine.getBossState() });
  };

  const hpPercent = (boss.bossHp / boss.maxHp) * 100;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-rose-500/30 space-y-6 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Gamified Boss Fight (Habitica-Style)</h3>
            <p className="text-xs text-slate-400">Jede Widerstands-Intervention fügt dem Boss Schaden zu</p>
          </div>
        </div>

        <button
          onClick={handleTestAttack}
          disabled={boss.isDefeated}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center gap-1.5 transition disabled:opacity-50"
        >
          <Zap className="w-4 h-4" /> Angreifen (-50 HP)
        </button>
      </div>

      <div className="p-6 glass-card rounded-2xl border border-rose-500/20 space-y-4 text-center">
        <div className="text-5xl my-2">👾</div>
        <div>
          <h4 className="text-lg font-extrabold text-white">{boss.bossName} (Level {boss.bossLevel})</h4>
          <p className="text-xs text-slate-400">Schlage den Kraken durch Achtsamkeit & Fokus!</p>
        </div>

        {/* Boss HP Bar */}
        <div className="max-w-md mx-auto space-y-1">
          <div className="flex justify-between text-xs font-mono font-bold">
            <span className="text-rose-400">HP: {boss.bossHp} / {boss.maxHp}</span>
            <span className="text-slate-400">{Math.round(hpPercent)}% verbleibend</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${hpPercent}%` }}
            ></div>
          </div>
        </div>

        {boss.isDefeated && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold font-mono animate-bounce">
            🏆 Gratulation! Der Doomscroll-Kraken wurde besiegt! (+100 Gems)
          </div>
        )}
      </div>
    </div>
  );
};
