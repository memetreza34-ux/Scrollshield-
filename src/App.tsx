import React, { useState } from 'react';
import { brainEngine } from './lib/aiBrainEngine';
import { BrainState, ImpulseEvent, AIRule } from './types';
import { BrainDashboard } from './components/BrainDashboard';
import { AICoachingModal } from './components/AICoachingModal';
import { SmartRuleGenerator } from './components/SmartRuleGenerator';
import { FocusTimer } from './components/FocusTimer';
import { AppShieldProfiles } from './components/AppShieldProfiles';
import { FocusGarden } from './components/FocusGarden';
import { BreathingExerciseModal } from './components/BreathingExerciseModal';
import { ChallengeUnlockModal } from './components/ChallengeUnlockModal';
import { SecurityShieldPanel } from './components/SecurityShieldPanel';
import { AudioSoundscapePanel } from './components/AudioSoundscapePanel';
import { CircadianEnergyBoard } from './components/CircadianEnergyBoard';
import { DataSovereigntyPanel } from './components/DataSovereigntyPanel';
import { Brain, Sparkles, Timer, Sliders, Activity, Trees, Wind, ShieldCheck, KeyRound, Music, Zap, Database } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'garden' | 'soundscapes' | 'biorhythm' | 'rules' | 'focus' | 'profiles' | 'security' | 'sovereignty'>('dashboard');
  const [brainState, setBrainState] = useState<BrainState>(brainEngine.calculateBrainState());
  const [events, setEvents] = useState<ImpulseEvent[]>(brainEngine.getEvents());
  const [rules, setRules] = useState<AIRule[]>(brainEngine.getRules());

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBreathingOpen, setIsBreathingOpen] = useState(false);
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  const [targetAppName, setTargetAppName] = useState('Instagram');

  const handleOpenCoachingModal = (appName: string) => {
    setTargetAppName(appName);
    setIsModalOpen(true);
  };

  const handleConfirmOutcome = (outcome: ImpulseEvent['outcome'], reflectionText?: string) => {
    brainEngine.registerImpulse(targetAppName, outcome, reflectionText);
    setEvents([...brainEngine.getEvents()]);
    setBrainState(brainEngine.calculateBrainState());
    setIsModalOpen(false);
  };

  const handleRuleAdded = () => {
    setRules([...brainEngine.getRules()]);
  };

  const handleSelectProfile = (id: string) => {
    setBrainState(prev => ({ ...prev, activeProfileId: id }));
  };

  return (
    <div className="min-h-screen pb-16">
      
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-violet-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white tracking-tight text-lg">ScrollShield</span>
              <span className="ml-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                PRO 2040
              </span>
            </div>
          </div>

          {/* Navigation Pills */}
          <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'dashboard' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Dashboard
            </button>

            <button
              onClick={() => setActiveTab('garden')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'garden' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trees className="w-3.5 h-3.5" /> Garten
            </button>

            <button
              onClick={() => setActiveTab('soundscapes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'soundscapes' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" /> Audio (Endel)
            </button>

            <button
              onClick={() => setActiveTab('biorhythm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'biorhythm' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Energie
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'rules' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> KI-Regeln
            </button>

            <button
              onClick={() => setActiveTab('focus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'focus' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Timer className="w-3.5 h-3.5" /> Monk-Mode
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'security' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Sicherheit
            </button>

            <button
              onClick={() => setActiveTab('sovereignty')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'sovereignty' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" /> Backup
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBreathingOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Wind className="w-3.5 h-3.5" /> One Sec Atem-Pause
            </button>

            <button
              onClick={() => setIsChallengeOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <KeyRound className="w-3.5 h-3.5" /> Notfall
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {activeTab === 'dashboard' && (
          <BrainDashboard
            brainState={brainState}
            events={events}
            onOpenCoachingModal={handleOpenCoachingModal}
          />
        )}

        {activeTab === 'garden' && (
          <FocusGarden />
        )}

        {activeTab === 'soundscapes' && (
          <AudioSoundscapePanel />
        )}

        {activeTab === 'biorhythm' && (
          <CircadianEnergyBoard />
        )}

        {activeTab === 'rules' && (
          <SmartRuleGenerator
            rules={rules}
            onRuleAdded={handleRuleAdded}
          />
        )}

        {activeTab === 'focus' && (
          <FocusTimer />
        )}

        {activeTab === 'profiles' && (
          <AppShieldProfiles
            activeProfileId={brainState.activeProfileId}
            onSelectProfile={handleSelectProfile}
          />
        )}

        {activeTab === 'security' && (
          <SecurityShieldPanel />
        )}

        {activeTab === 'sovereignty' && (
          <DataSovereigntyPanel />
        )}

      </main>

      {/* Interventions Modals */}
      <AICoachingModal
        appName={targetAppName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirmOutcome={handleConfirmOutcome}
      />

      <BreathingExerciseModal
        isOpen={isBreathingOpen}
        onClose={() => setIsBreathingOpen(false)}
        onCompleted={(alt) => {
          setIsBreathingOpen(false);
        }}
      />

      <ChallengeUnlockModal
        isOpen={isChallengeOpen}
        onClose={() => setIsChallengeOpen(false)}
        onUnlocked={() => {
          setIsChallengeOpen(false);
        }}
      />
    </div>
  );
};
