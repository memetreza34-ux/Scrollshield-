import React from 'react';
import { Sun, Moon, BatteryCharging, Zap, Clock, ShieldAlert } from 'lucide-react';

export const CircadianEnergyBoard: React.FC = () => {
  const hours = [
    { time: '08:00', energy: 65, level: 'Aufwärmen' },
    { time: '10:00', energy: 95, level: 'Peak Fokus (Monk Mode)' },
    { time: '14:00', energy: 45, level: 'Post-Lunch Dip (Risiko)' },
    { time: '16:00', energy: 80, level: 'Zweiter Fokus-Peak' },
    { time: '21:00', energy: 30, level: 'Regeneration & Dopamin-Reset' },
  ];

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/20 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Biorhythmus & Fokus-Energie (RescueTime-Style)</h3>
          <p className="text-xs text-slate-400">KI-Vorhersage deines circadianen Rhythmus zur Vermeidung von Tiefpunkten</p>
        </div>
      </div>

      {/* Circadian Energy Timeline */}
      <div className="space-y-4 pt-2">
        {hours.map((h, i) => (
          <div key={i} className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 font-mono text-sm text-slate-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{h.time} Uhr</span>
            </div>

            <div className="flex-1 max-w-md mx-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{h.level}</span>
                <span className="font-mono font-bold text-amber-400">{h.energy}% Energie</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    h.energy > 80 ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' :
                    h.energy > 50 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                    'bg-gradient-to-r from-rose-500 to-amber-500'
                  }`}
                  style={{ width: `${h.energy}%` }}
                ></div>
              </div>
            </div>

            <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${
              h.energy > 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              h.energy > 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {h.energy > 80 ? 'Optimal' : h.energy > 50 ? 'Stabil' : 'Binge-Risiko'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
