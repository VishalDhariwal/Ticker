// ============================================================
// Data Management Page — Export / Import / Clear
// ============================================================

import { useState } from 'react';
import { exportToJSON, exportToCSV, importFromJSON, downloadFile } from '@/utils/exportImport';
import type { Session, StorageSchema } from '@/types';

export function DataPage() {
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleExportJSON = () => {
    chrome.storage.local.get(null, (result) => {
      const json = exportToJSON(result as Partial<StorageSchema>);
      downloadFile(json, `ticker-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    });
  };

  const handleExportCSV = () => {
    chrome.storage.local.get('sessions', (result) => {
      const sessions = (result.sessions ?? []) as Session[];
      const csv = exportToCSV(sessions);
      downloadFile(csv, `ticker-sessions-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = importFromJSON(ev.target?.result as string);
        chrome.storage.local.get(null, (existing) => {
          const merged: Record<string, unknown> = { ...data };
          
          if (data.sessions && existing.sessions) {
            // merge sessions based on ID
            const existingMap = new Map((existing.sessions as Session[]).map(s => [s.id, s]));
            (data.sessions as Session[]).forEach(s => existingMap.set(s.id, s));
            merged.sessions = Array.from(existingMap.values());
          }
          if (data.trackedSites && existing.trackedSites) {
            const existingMap = new Map((existing.trackedSites as any[]).map(s => [s.id, s]));
            (data.trackedSites as any[]).forEach(s => existingMap.set(s.id, s));
            merged.trackedSites = Array.from(existingMap.values());
          }
          if (data.todos && existing.todos) {
            const existingMap = new Map((existing.todos as any[]).map(s => [s.id, s]));
            (data.todos as any[]).forEach(s => existingMap.set(s.id, s));
            merged.todos = Array.from(existingMap.values());
          }

          chrome.storage.local.set(merged, () => {
            setImportStatus({ type: 'success', msg: 'Data imported successfully. Reload the extension to see changes.' });
            setImporting(false);
          });
        });
      } catch (err) {
        setImportStatus({ type: 'error', msg: String(err) });
        setImporting(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAll = () => {
    chrome.storage.local.clear(() => {
      setShowConfirm(false);
      setImportStatus({ type: 'success', msg: 'All data cleared. Restart the extension.' });
    });
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Data Management</h1>
        <p className="text-sm text-slate-500 mt-1">Backup, restore, or reset your Ticker data</p>
      </div>

      {/* Export */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Export</h2>
        <p className="text-xs text-slate-600">Download your data for backup or analysis.</p>
        <div className="flex gap-3">
          <button
            onClick={handleExportJSON}
            className="flex-1 py-2.5 bg-ticker-600/20 text-ticker-300 border border-ticker-500/30 rounded-xl text-sm font-medium hover:bg-ticker-600/30 transition-colors"
          >
            Export JSON
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 py-2.5 bg-surface-800 text-slate-300 border border-white/5 rounded-xl text-sm font-medium hover:bg-surface-700 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Import */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Import</h2>
        <p className="text-xs text-slate-600">Restore from a previously exported JSON backup. Existing data will be merged.</p>
        <label className="block">
          <div className="py-2.5 px-4 bg-surface-800 text-slate-300 border border-white/5 rounded-xl text-sm font-medium hover:bg-surface-700 transition-colors cursor-pointer text-center">
            {importing ? 'Importing…' : 'Choose JSON file'}
          </div>
          <input type="file" accept=".json" onChange={handleImport} className="sr-only" />
        </label>
        {importStatus && (
          <p className={`text-sm ${importStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {importStatus.msg}
          </p>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl p-6 space-y-4 border border-red-500/20 bg-red-500/5">
        <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
        <p className="text-xs text-slate-600">Permanently deletes all sessions, settings, and site configurations. This cannot be undone.</p>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="py-2.5 px-5 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/10 transition-colors"
          >
            Clear All Data
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-300 font-medium">Are you absolutely sure?</p>
            <div className="flex gap-2">
              <button onClick={handleClearAll} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-500 transition-colors">
                Yes, clear everything
              </button>
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 bg-surface-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-surface-700 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
