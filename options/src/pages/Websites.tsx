// ============================================================
// Websites Management Page
// ============================================================

import { useState, useEffect } from 'react';
import { isValidDomain } from '@/utils/domain';
import type { TrackedSite, Todo } from '@/types';

const SITE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#a855f7','#06b6d4','#64748b','#f97316','#84cc16'];

function generateId(): string { return `site-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }

export function WebsitesPage() {
  const [sites, setSites] = useState<TrackedSite[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    chrome.storage.local.get(['trackedSites', 'todos'], (result) => {
      setSites((result.trackedSites ?? []) as TrackedSite[]);
      setTodos((result.todos ?? []) as Todo[]);
    });
  }, []);

  const saveSites = (updated: TrackedSite[]) => {
    setSites(updated);
    chrome.storage.local.set({ trackedSites: updated });
  };

  const addSite = async () => {
    const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!isValidDomain(domain)) { setError('Invalid domain format'); return; }
    if (sites.some((s) => s.domain === domain)) { setError('Already tracked'); return; }
    
    try {
      const granted = await chrome.permissions.request({
        origins: [`*://*.${domain}/*`, `*://${domain}/*`]
      });
      if (!granted) {
        setError('Permission required to track this site.');
        return;
      }
    } catch (err) {
      console.warn("Permission request failed", err);
    }

    const colorIdx = sites.length % SITE_COLORS.length;
    saveSites([...sites, {
      id: generateId(), domain, enabled: true, floatingTimer: true,
      rememberLastTodo: false, defaultTodoId: null, lastTodoId: null,
      color: SITE_COLORS[colorIdx],
    }]);
    setNewDomain('');
    setError('');
  };

  const removeSite = (id: string) => saveSites(sites.filter((s) => s.id !== id));

  const toggleSite = async (id: string) => {
    const site = sites.find(s => s.id === id);
    if (site && !site.enabled) {
      try {
        const granted = await chrome.permissions.request({
          origins: [`*://*.${site.domain}/*`, `*://${site.domain}/*`]
        });
        if (!granted) return;
      } catch (e) {}
    }
    saveSites(sites.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const updateSite = async (id: string, patch: Partial<TrackedSite>) => {
    if (patch.floatingTimer) {
      const site = sites.find(s => s.id === id);
      if (site) {
        try {
          const granted = await chrome.permissions.request({
            origins: [`*://*.${site.domain}/*`, `*://${site.domain}/*`]
          });
          if (!granted) return;
        } catch (e) {}
      }
    }
    saveSites(sites.map((s) => s.id === id ? { ...s, ...patch } : s));
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Tracked Websites</h1>
        <p className="text-sm text-slate-500 mt-1">Sites where Ticker automatically measures your time</p>
      </div>

      {/* Add Website */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Add Website</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => { setNewDomain(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && addSite()}
            placeholder="github.com or localhost:3000"
            className="flex-1 bg-surface-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-ticker-500/50"
          />
          <button
            onClick={addSite}
            className="px-4 py-2.5 bg-ticker-600 text-white rounded-xl text-sm font-medium hover:bg-ticker-500 transition-colors"
          >
            Add
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {/* Sites List */}
      <div className="space-y-2">
        {sites.map((site) => {
          const siteTodos = todos.filter((t) => t.siteId === site.id);
          return (
            <div key={site.id} className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: site.color }} />
                  <span className="font-medium text-slate-200">{site.domain}</span>
                  {siteTodos.length > 0 && (
                    <span className="text-xs text-slate-600">{siteTodos.length} tasks</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleSite(site.id)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${site.enabled ? 'bg-ticker-600' : 'bg-surface-700'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${site.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <button
                    onClick={() => removeSite(site.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Per-site options */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 pl-6 text-xs text-slate-500">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={site.floatingTimer}
                    onChange={(e) => updateSite(site.id, { floatingTimer: e.target.checked })}
                    className="accent-indigo-500 w-3.5 h-3.5"
                  />
                  Floating timer
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={site.rememberLastTodo}
                    onChange={(e) => updateSite(site.id, { rememberLastTodo: e.target.checked })}
                    className="accent-indigo-500 w-3.5 h-3.5"
                  />
                  Remember last task
                </label>
              </div>
            </div>
          );
        })}

        {sites.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            No websites tracked yet. Add one above.
          </div>
        )}
      </div>
    </div>
  );
}
