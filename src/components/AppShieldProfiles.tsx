import React from 'react';
import { ProtectionProfile } from '../types';
import { Shield, Moon, Briefcase, Feather, Sliders, Check } from 'lucide-react';

interface AppShieldProfilesProps {
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
}

export const AppShieldProfiles: React.FC<AppShieldProfilesProps> = ({
  activeProfileId,
  onSelectProfile
}) => {
  const profiles: ProtectionProfile[] = [
    {
      id: 'profile-soft',
      name: 'Sanfte achtsame Führung',
      icon: 'Feather',
      description: '10 Sekunden Bedenkzeit bei Öffnung. Ideal für leichte Gewohnheitsanpassung.',
      delaySeconds: 10,
      strictnessLevel: 'gentle',
      blockedApps: ['Instagram', 'TikTok'],
      aiAdaptiveMode: true
    },
    {
      id: 'profile-balanced',
      name: 'Ausgewogener Schutz (Empfohlen)',
      icon: 'Shield',
      description: '15–20 Sekunden Verlangen-Pause mit KI-Reflexions-Fragen & Anti-Binge Sperre.',
      delaySeconds: 15,
      strictnessLevel: 'balanced',
      blockedApps: ['Instagram', 'TikTok', 'YouTube Shorts', 'X (Twitter)'],
      aiAdaptiveMode: true
    },
    {
      id: 'profile-deepwork',
      name: 'Deep Work Monk-Mode',
      icon: 'Briefcase',
      description: 'Strikte Blockade aller Social Media- und Unterhaltungs-Apps während der Arbeitszeit.',
      delaySeconds: 45,
      strictnessLevel: 'strict',
      blockedApps: ['Instagram', 'TikTok', 'YouTube Shorts', 'X (Twitter)', 'Reddit', 'Netflix'],
      aiAdaptiveMode: true
    },
    {
      id: 'profile-sleep',
      name: 'Nachtruhe & Dopamin-Reset',
      icon: 'Moon',
      description: 'Aktiv ab 21:30 Uhr. Schützt vor Late-Night-Doomscrolling und Schlafstörungen.',
      delaySeconds: 60,
      strictnessLevel: 'deep_monk',
      blockedApps: ['Alle Social Apps'],
      aiAdaptiveMode: true
    }
  ];

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Schutzprofile & Regeln</h3>
              <p className="text-xs text-slate-400">Wähle den passenden Intensitätsgrad für deinen Alltag</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {profiles.map((p) => {
            const isSelected = activeProfileId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectProfile(p.id)}
                className={`p-6 rounded-2xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-slate-900/90 border-cyan-400 shadow-xl shadow-cyan-500/10 scale-[1.01]'
                    : 'glass-card border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${
                      isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {p.id.includes('soft') && <Feather className="w-6 h-6" />}
                      {p.id.includes('balanced') && <Shield className="w-6 h-6" />}
                      {p.id.includes('deepwork') && <Briefcase className="w-6 h-6" />}
                      {p.id.includes('sleep') && <Moon className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">{p.name}</h4>
                      <span className="text-[11px] font-mono text-cyan-400">{p.delaySeconds}s Verzögerung</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="p-1 rounded-full bg-cyan-500 text-slate-950">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {p.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/60">
                  {p.blockedApps.map((app, i) => (
                    <span key={i} className="text-[10px] px-2.5 py-1 rounded-md bg-slate-900/80 text-slate-300 border border-slate-800 font-mono">
                      {app}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
