import React, { useState } from 'react';
import { StorageMigrationEngine } from '../lib/storageMigrationEngine';
import { Download, Upload, ShieldCheck, Database, CheckCircle2, AlertCircle } from 'lucide-react';

export const DataSovereigntyPanel: React.FC = () => {
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  const handleDownload = () => {
    StorageMigrationEngine.downloadBackupFile();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageMigrationEngine.restoreFromJSON(content);
      setRestoreStatus(res.message);
    };
    reader.readAsText(file);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-cyan-500/30 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">15-Jahre Datensouveränität & Backup (Local-First)</h3>
          <p className="text-xs text-slate-400">100% Unabhängigkeit von Cloud-Servern – Daten gehören für immer dir</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Backup Download */}
        <div className="p-5 glass-card rounded-2xl border border-slate-800 space-y-4">
          <div>
            <h4 className="font-bold text-white text-base">Lokales JSON-Backup Exportieren</h4>
            <p className="text-xs text-slate-400 mt-1">Exportiert deine gesamten Verlaufsdaten, KI-Regeln & Achtsamkeits-Gems als offenes JSON-Paket.</p>
          </div>

          <button
            onClick={handleDownload}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition"
          >
            <Download className="w-4 h-4" /> JSON-Backup Herunterladen
          </button>
        </div>

        {/* Backup Restore */}
        <div className="p-5 glass-card rounded-2xl border border-slate-800 space-y-4">
          <div>
            <h4 className="font-bold text-white text-base">Backup Wiederherstellen</h4>
            <p className="text-xs text-slate-400 mt-1">Importiert ein bestehendes Backup inklusive automatischer Schema-Migration (v15+).</p>
          </div>

          <label className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 cursor-pointer transition">
            <Upload className="w-4 h-4" /> JSON-Datei Auswählen
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {restoreStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          {restoreStatus}
        </div>
      )}
    </div>
  );
};
