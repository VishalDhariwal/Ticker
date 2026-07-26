// ============================================================
// Popup Dashboard — Main View
// ============================================================

import { useState, useEffect } from 'react';
import { useTrackerState } from '@/hooks/useTrackerState';
import { formatDuration } from '@/utils/time';
import type { Todo, TrackedSite } from '@/types';

export function Dashboard() {
  const state = useTrackerState();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [currentSiteObj, setCurrentSiteObj] = useState<TrackedSite | null>(null);
  const [showTodoPicker, setShowTodoPicker] = useState(false);

  // Load todos for current site
  useEffect(() => {
    if (!state.currentSiteId) { setTodos([]); return; }
    chrome.storage.local.get(['todos', 'trackedSites'], (result) => {
      const allTodos = (result.todos ?? []) as Todo[];
      const sites = (result.trackedSites ?? []) as TrackedSite[];
      setTodos(allTodos.filter((t) => t.siteId === state.currentSiteId));
      setCurrentSiteObj(sites.find((s) => s.id === state.currentSiteId) ?? null);
    });
  }, [state.currentSiteId]);

  const currentTodo = todos.find((t) => t.id === state.currentTodoId);

  const handlePauseResume = () => {
    chrome.runtime.sendMessage({
      type: state.isTracking ? 'MANUAL_PAUSE' : 'MANUAL_RESUME',
    });
  };

  const handleSelectTodo = (todoId: string | null) => {
    chrome.runtime.sendMessage({ type: 'SELECT_TODO', payload: todoId });
    setShowTodoPicker(false);
  };

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/index.html') + '#analytics' });
  };

  const openSettings = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/index.html') });
  };

  const addCurrentSite = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url;
      if (url) {
        const tab = chrome.tabs.create({ url: chrome.runtime.getURL('options/index.html') + '#websites' });
      }
    });
  };

  // liveSeconds comes from the hook — it ticks every second client-side
  // and equals (completed sessions today) + (current session elapsed)
  const { liveSeconds } = state;

  return (
    <div className="flex flex-col min-h-[400px] bg-surface-950 text-slate-200 select-none animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-ticker-500 to-ticker-700 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.5" />
              <path d="M6 3.5V6L7.5 7.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white tracking-wide">ticker</span>
        </div>
        <button
          onClick={openSettings}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13.5 8c0-.3-.02-.59-.06-.87l1.5-1.17-1.5-2.6-1.73.94a5.5 5.5 0 00-1.5-.87L9.83 2h-3l-.38 1.43a5.5 5.5 0 00-1.5.87L3.22 3.36l-1.5 2.6L3.22 7.13A5.53 5.53 0 003.16 8c0 .3.02.59.06.87L1.72 10.04l1.5 2.6 1.73-.94c.47.34.98.62 1.5.87L6.83 14h3l.38-1.43c.52-.25 1.03-.53 1.5-.87l1.73.94 1.5-2.6-1.5-1.17c.04-.28.06-.57.06-.87z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 py-5 gap-4">
        {state.currentSite ? (
          <>
            {/* Status Badge */}
            <div className={`flex items-center gap-2 self-start px-3 py-1 rounded-full text-xs font-medium ${state.isTracking
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border border-white/5'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${state.isTracking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {state.isTracking
                ? 'Tracking'
                : state.pauseReason === 'idle' ? 'Idle'
                  : state.pauseReason === 'manual' ? 'Paused'
                    : state.pauseReason === 'blur' ? 'Window inactive'
                      : 'Paused'}
            </div>

            {/* Site & Timer */}
            <div className="glass rounded-2xl p-4 space-y-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentSiteObj?.color ?? '#6366f1' }}
                />
                <span className="text-sm font-medium text-slate-300 max-w-[200px] truncate">{state.currentSite}</span>
              </div>
              <div className="font-mono-ticker text-4xl font-bold text-white tracking-tight">
                {formatDuration(liveSeconds)}
              </div>
              <div className="text-xs text-slate-500">today</div>
            </div>

            {/* Todo Picker */}
            {todos.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Task</div>
                <div className="relative">
                  <button
                    onClick={() => setShowTodoPicker(!showTodoPicker)}
                    className="w-full flex items-center justify-between glass rounded-xl px-3 py-2.5 text-sm hover:border-ticker-500/30 transition-colors group"
                  >
                    <span className={currentTodo ? 'text-slate-200' : 'text-slate-500'}>
                      {currentTodo?.title ?? 'No task selected'}
                    </span>
                    <svg
                      className={`text-slate-500 transition-transform ${showTodoPicker ? 'rotate-180' : ''}`}
                      width="14" height="14" viewBox="0 0 14 14" fill="none"
                    >
                      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {showTodoPicker && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-surface-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10 animate-slide-up">
                      <button
                        onClick={() => handleSelectTodo(null)}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 transition-colors ${!state.currentTodoId ? 'text-ticker-400' : 'text-slate-400'}`}
                      >
                        No task
                      </button>
                      {todos.map((todo) => (
                        <button
                          key={todo.id}
                          onClick={() => handleSelectTodo(todo.id)}
                          className={`w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 transition-colors border-t border-white/5 ${state.currentTodoId === todo.id ? 'text-ticker-400 bg-ticker-500/10' : 'text-slate-300'
                            }`}
                        >
                          {todo.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={openSettings}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors text-left"
              >
                + Add tasks for {state.currentSite}
              </button>
            )}
          </>
        ) : (
          /* Not on a tracked site */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <div className="w-14 h-14 rounded-2xl bg-surface-800 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="10" stroke="#4b5563" strokeWidth="2" />
                <path d="M14 8v6l4 4" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-400">Not tracking</p>
              <p className="text-xs text-slate-600 mt-1">Visit a tracked website to start</p>
            </div>
            <button
              onClick={addCurrentSite}
              className="text-xs text-ticker-400 hover:text-ticker-300 transition-colors border border-ticker-500/30 px-3 py-1.5 rounded-lg hover:bg-ticker-500/10"
            >
              + Track this site
            </button>
          </div>
        )}
      </main>

      {/* Footer Actions */}
      <footer className="px-4 pb-4 pt-2 flex gap-2">
        {state.currentSite && (
          <button
            onClick={handlePauseResume}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${state.isTracking
                ? 'bg-surface-800 text-slate-300 hover:bg-surface-700 border border-white/5'
                : 'bg-ticker-600 text-white hover:bg-ticker-500 glow-indigo'
              }`}
          >
            {state.isTracking ? 'Pause' : 'Resume'}
          </button>
        )}
        <button
          onClick={openDashboard}
          className={`${state.currentSite ? 'flex-1' : 'w-full'} py-2 rounded-xl text-sm font-medium bg-ticker-600/20 text-ticker-300 hover:bg-ticker-600/30 border border-ticker-500/20 transition-all`}
        >
          Dashboard
        </button>
      </footer>
    </div>
  );
}
