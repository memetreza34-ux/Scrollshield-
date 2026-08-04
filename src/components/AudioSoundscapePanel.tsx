import React, { useState } from 'react';
import { biorhythmAudio } from '../lib/biorhythmAudio';
import { Volume2, VolumeX, Sparkles, Music, Activity, Waves } from 'lucide-react';

export const AudioSoundscapePanel: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(biorhythmAudio.getIsPlaying());
  const [mode, setMode] = useState<'alpha' | 'theta' | 'deep_zen'>('alpha');

  const toggleAudio = () => {
    if (isPlaying) {
      biorhythmAudio.stopSoundscape();
      setIsPlaying(false);
    } else {
      const baseFreq = mode === 'alpha' ? 216 : mode === 'theta' ? 144 : 432;
      const beatFreq = mode === 'alpha' ? 10 : mode === 'theta' ? 6 : 4;
      biorhythmAudio.startFocusSoundscape(baseFreq, beatFreq);
      setIsPlaying(true);
    }
  };

  const handleModeChange = (newMode: 'alpha' | 'theta' | 'deep_zen') => {
    setMode(newMode);
    if (isPlaying) {
      const baseFreq = newMode === 'alpha' ? 216 : newMode === 'theta' ? 144 : 432;
      const beatFreq = newMode === 'alpha' ? 10 : newMode === 'theta' ? 6 : 4;
      biorhythmAudio.startFocusSoundscape(baseFreq, beatFreq);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-violet-500/30 space-y-6 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-violet-500/15 text-violet-400 border border-violet-500/30">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Generative Fokus-Audio-Engine (Endel-Style)</h3>
            <p className="text-xs text-slate-400">Synthetisierte Binaural Beats (HTML5 Audio Context) – 100% Offline</p>
          </div>
        </div>

        <button
          onClick={toggleAudio}
          className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition shadow-lg ${
            isPlaying
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/20'
          }`}
        >
          {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          {isPlaying ? 'Soundscape Stoppen' : 'Fokus Sound Abspielen'}
        </button>
      </div>

      {/* Preset Frequency Modes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div
          onClick={() => handleModeChange('alpha')}
          className={`p-4 rounded-2xl cursor-pointer border transition ${
            mode === 'alpha'
              ? 'bg-slate-900 border-violet-400 shadow-lg shadow-violet-500/10'
              : 'glass-card border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 text-violet-400 text-xs font-bold mb-1">
            <Waves className="w-4 h-4" /> 10Hz Alpha Fokus
          </div>
          <div className="text-sm font-bold text-white">Konzentriertes Arbeiten</div>
          <div className="text-[11px] text-slate-400 mt-1">Erhöht die neuronale Synchronisation bei komplexen Aufgaben.</div>
        </div>

        <div
          onClick={() => handleModeChange('theta')}
          className={`p-4 rounded-2xl cursor-pointer border transition ${
            mode === 'theta'
              ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/10'
              : 'glass-card border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-1">
            <Activity className="w-4 h-4" /> 6Hz Theta Flow
          </div>
          <div className="text-sm font-bold text-white">Kreativitäts-Zustand</div>
          <div className="text-[11px] text-slate-400 mt-1">Fördert tiefes Problemlosem und intuitive Ideenfindung.</div>
        </div>

        <div
          onClick={() => handleModeChange('deep_zen')}
          className={`p-4 rounded-2xl cursor-pointer border transition ${
            mode === 'deep_zen'
              ? 'bg-slate-900 border-emerald-400 shadow-lg shadow-emerald-500/10'
              : 'glass-card border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
            <Sparkles className="w-4 h-4" /> 432Hz Solfeggio Zen
          </div>
          <div className="text-sm font-bold text-white">Dopamin & Entspannung</div>
          <div className="text-[11px] text-slate-400 mt-1">Befreit von digitalem Stress & verringert Reizüberflutung.</div>
        </div>
      </div>
    </div>
  );
};
