// ============================================================
// Options App — Tabbed Layout
// ============================================================

import { useState, useEffect } from 'react';
import { TrackingPage } from './pages/Tracking';
import { WebsitesPage } from './pages/Websites';
import { TodosPage } from './pages/Todos';
import { AnalyticsPage } from './pages/Analytics';
import { DataPage } from './pages/DataManagement';

type Tab = 'analytics' | 'websites' | 'todos' | 'tracking' | 'data';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'websites', label: 'Websites', icon: '🌐' },
  { id: 'todos', label: 'Tasks', icon: '✓' },
  { id: 'tracking', label: 'Settings', icon: '⚙️' },
  { id: 'data', label: 'Data', icon: '💾' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');

  useEffect(() => {
    // Support #anchor in URL for deep linking from popup
    const hash = window.location.hash.replace('#', '') as Tab;
    if (hash && TABS.some((t) => t.id === hash)) setActiveTab(hash);
  }, []);

  return (
    <div className="min-h-screen flex bg-surface-950 text-slate-200">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 border-r border-white/5 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ticker-500 to-ticker-700 flex items-center justify-center shadow-lg">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5"/>
              <path d="M8 4.5V8L10 10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Ticker</div>
            <div className="text-xs text-slate-500">Time Tracker</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pb-4 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-ticker-600/20 text-ticker-300 border border-ticker-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5">
          <div className="text-xs text-slate-600">v1.0.0 · Offline-first</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'analytics' && <AnalyticsPage />}
        {activeTab === 'websites' && <WebsitesPage />}
        {activeTab === 'todos' && <TodosPage />}
        {activeTab === 'tracking' && <TrackingPage />}
        {activeTab === 'data' && <DataPage />}
      </main>
    </div>
  );
}
