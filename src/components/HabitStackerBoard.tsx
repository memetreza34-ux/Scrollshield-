import React, { useState } from 'react';
import { Layers, ArrowRight, CheckCircle, RefreshCw, BookOpen, Dumbbell, Sparkles } from 'lucide-react';

export const HabitStackerBoard: React.FC = () => {
  const [completedHabits, setCompletedHabits] = useState<string[]>([]);

  const habits = [
    { id: 'h1', title: '2 Min. Dehnen & Strecken', icon: Dumbbell, category: 'Körper' },
    { id: 'h2', title: '1 Buchseite lesen', icon: BookOpen, category: 'Geist' },
    { id: 'h3', title: '3 tiefe Atemzüge am Fenster', icon: Sparkles, category: 'Achtsamkeit' },
  ];

  const toggleHabit = (id: string) => {
    if (completedHabits.includes(id)) {
      setCompletedHabits(completedHabits.filter(h => h !== id));
    } else {
      setCompletedHabits([...completedHabits, id]);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-cyan-500/20 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Habit-Stacking Engine (RoutineFlow-Style)</h3>
          <p className="text-xs text-slate-400">Wandle abgefangene Scroll-Impulse sofort in 2-Minuten Mikro-Gewohnheiten um</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {habits.map((h) => {
          const isDone = completedHabits.includes(h.id);
          const IconComp = h.icon;
          return (
            <div
              key={h.id}
              onClick={() => toggleHabit(h.id)}
              className={`p-5 rounded-2xl cursor-pointer border transition flex flex-col justify-between gap-4 ${
                isDone
                  ? 'bg-slate-900 border-emerald-500/50 text-emerald-300'
                  : 'glass-card border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-slate-900 text-cyan-400 border border-slate-800">
                  <IconComp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                  {h.category}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm">{h.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1">Dauer: ~2 Minuten</p>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold">
                <span>{isDone ? 'Erfüllt ✅' : 'Tippen zum Erfüllen'}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
