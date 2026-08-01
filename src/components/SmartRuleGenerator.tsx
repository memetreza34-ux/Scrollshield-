import React, { useState } from 'react';
import { AIRule } from '../types';
import { brainEngine } from '../lib/aiBrainEngine';
import { Sparkles, Plus, ShieldCheck, Zap, Terminal } from 'lucide-react';

interface SmartRuleGeneratorProps {
  rules: AIRule[];
  onRuleAdded: () => void;
}

export const SmartRuleGenerator: React.FC<SmartRuleGeneratorProps> = ({
  rules,
  onRuleAdded
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    setIsGenerating(true);
    setTimeout(() => {
      brainEngine.addRuleFromPrompt(promptInput);
      setPromptInput('');
      setIsGenerating(false);
      onRuleAdded();
    }, 800);
  };

  const samplePrompts = [
    'Blockiere TikTok & Instagram automatisch, wenn mein Stress-Level abends hoch ist.',
    'Erlaube YouTube werktags erst ab 18:00 Uhr und nur mit 30 Sek. Bedenkzeit.',
    'Schalte bei Arbeits-Fokus alle Social Media Benachrichtigungen stumm.'
  ];

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-violet-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">KI-Regel-Generator (NLP)</h3>
            <p className="text-xs text-slate-400">Erstelle Schutzregeln in natürlicher Sprache</p>
          </div>
        </div>

        <form onSubmit={handleCreateRule} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="z.B. Blockiere Reels ab 22:00 Uhr oder erhöhe die Pause auf 30 Sekunden..."
              className="w-full py-4 pl-4 pr-32 rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 transition shadow-inner"
            />
            <button
              type="submit"
              disabled={isGenerating || !promptInput.trim()}
              className="absolute right-2 top-2 bottom-2 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-violet-500/20 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {isGenerating ? <Zap className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Regel Generieren
            </button>
          </div>
        </form>

        {/* Sample Prompts */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Beispiel-Prompts zum Ausprobieren:</span>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => setPromptInput(sample)}
                className="text-xs p-2.5 rounded-xl glass-card text-slate-300 hover:text-white border border-slate-800 text-left transition"
              >
                💡 "{sample}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active AI Rules List */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" /> Aktive KI-Schutzregeln ({rules.length})
          </h4>
        </div>

        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  "{rule.prompt}"
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Bedingung: {rule.condition} → Aktion: {rule.action}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Aktiv
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
