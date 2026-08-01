import React, { useState } from 'react';
import { brainEngine } from './lib/aiBrainEngine';
import { BrainState, ImpulseEvent, AIRule } from './types';
import { BrainDashboard } from './components/BrainDashboard';
import { AICoachingModal } from './components/AICoachingModal';
import { SmartRuleGenerator } from './components/SmartRuleGenerator';
import { FocusTimer } from './components/FocusTimer';
import { AppShieldProfiles } from './components/AppShieldProfiles';
import { Brain, Sparkles, Timer, Sliders, Activity } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rules' | 'focus' | 'profiles'>('dashboard');
  const [brainState, setBrainState] = useState<BrainState>(brainEngine.calculateBrainState());
  const [events, setEvents] = useState<ImpulseEvent[]>(brainEngine.getEvents());
  const [rules, setRules] = useState<AIRule[]>(brainEngine.getRules());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white tracking-tight text-lg">ScrollShield</span>
              <span className="ml-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                KI-BRAIN v1.0
              </span>
            </div>
          </div>

          {/* Navigation Pills */}
          <nav className="hidden sm:flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'dashboard' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'rules' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> KI-Regeln
            </button>
            <button
              onClick={() => setActiveTab('focus')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'focus' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Timer className="w-3.5 h-3.5" /> Monk-Mode
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'profiles' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Profile
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              KI-Schutz Aktiv
            </div>
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

      </main>

      {/* Interactive Micro-Reflection Pause Modal */}
      <AICoachingModal
        appName={targetAppName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirmOutcome={handleConfirmOutcome}
      />
    </div>
  );
};
