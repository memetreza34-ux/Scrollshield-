import React, { useState } from 'react';
import { SecurityCrypto } from '../lib/securityCrypto';
import { ShieldCheck, Lock, Key, Cpu, AlertTriangle, CheckCircle, Terminal } from 'lucide-react';

export const SecurityShieldPanel: React.FC = () => {
  const [testInput, setTestInput] = useState('');
  const [sanitizedResult, setSanitizedResult] = useState('');

  const handleTestSanitizer = (e: React.FormEvent) => {
    e.preventDefault();
    const result = SecurityCrypto.sanitizeInput(testInput);
    setSanitizedResult(result);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-cyan-500/30 space-y-6 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">ScrollShield Cyber-Security Status</h3>
            <p className="text-xs text-slate-400">Aktiver Schutz vor Hackerangriffen, XSS-Injektionen & Datenlecks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 glass-card rounded-2xl border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Lock className="w-4 h-4" /> Web Crypto AES-256
            </div>
            <div className="text-base font-bold text-white">Zero-Trust Storage</div>
            <p className="text-xs text-slate-400">Lokale Nutzungsdaten werden vor dem Speichern in localStorage verschlüsselt.</p>
          </div>

          <div className="p-5 glass-card rounded-2xl border border-cyan-500/20 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Cpu className="w-4 h-4" /> XSS & Prompt-Guard
            </div>
            <div className="text-base font-bold text-white">Eingabefilter Aktiv</div>
            <p className="text-xs text-slate-400">Alle Freitexte & KI-Prompts werden bereinigt und auf Prompt-Injections geprüft.</p>
          </div>

          <div className="p-5 glass-card rounded-2xl border border-violet-500/20 space-y-2">
            <div className="flex items-center gap-2 text-violet-400 text-xs font-bold uppercase tracking-wider">
              <Key className="w-4 h-4" /> No Secrets Leakage
            </div>
            <div className="text-base font-bold text-white">100% Secret-Frei</div>
            <p className="text-xs text-slate-400">Keine API-Schlüssel oder Passwörter im Quellcode exponiert.</p>
          </div>
        </div>

        {/* Interactive XSS Sanitizer Tester */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" /> Security-Tester (XSS Input Sanitization)
          </h4>
          <form onSubmit={handleTestSanitizer} className="flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="z.B. <script>alert('hack')</script>"
              className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition"
            >
              Testen
            </button>
          </form>

          {sanitizedResult && (
            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs font-mono text-emerald-400">
              Bereinigtes Resultat: {sanitizedResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
