// ============================================================
// Todos / Tasks Management Page
// ============================================================

import { useState, useEffect } from 'react';
import type { Todo, TrackedSite } from '@/types';

function generateId(): string { return `todo-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }

export function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [sites, setSites] = useState<TrackedSite[]>([]);
  const [newTitles, setNewTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    chrome.storage.local.get(['todos', 'trackedSites'], (result) => {
      setTodos((result.todos ?? []) as Todo[]);
      setSites((result.trackedSites ?? []) as TrackedSite[]);
    });
  }, []);

  const saveTodos = (updated: Todo[]) => {
    setTodos(updated);
    chrome.storage.local.set({ todos: updated });
  };

  const addTodo = (siteId: string) => {
    const title = (newTitles[siteId] ?? '').trim();
    if (!title) return;
    saveTodos([...todos, { id: generateId(), siteId, title, createdAt: new Date().toISOString() }]);
    setNewTitles((prev) => ({ ...prev, [siteId]: '' }));
  };

  const removeTodo = (id: string) => saveTodos(todos.filter((t) => t.id !== id));

  const enabledSites = sites.filter((s) => s.enabled);

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        <p className="text-sm text-slate-500 mt-1">Categorize your time with optional tasks per website</p>
      </div>

      {enabledSites.length === 0 && (
        <div className="text-center py-12 text-slate-600">
          Add tracked websites first, then create tasks for them.
        </div>
      )}

      {enabledSites.map((site) => {
        const siteTodos = todos.filter((t) => t.siteId === site.id);
        return (
          <div key={site.id} className="glass rounded-2xl p-5 space-y-4">
            {/* Site Header */}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: site.color }} />
              <span className="font-semibold text-slate-200">{site.domain}</span>
              <span className="text-xs text-slate-600 ml-auto">{siteTodos.length} tasks</span>
            </div>

            {/* Task List */}
            {siteTodos.length > 0 && (
              <ul className="space-y-1.5 pl-4">
                {siteTodos.map((todo) => (
                  <li key={todo.id} className="flex items-center justify-between group py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-sm text-slate-300">{todo.title}</span>
                    <button
                      onClick={() => removeTodo(todo.id)}
                      className="text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Add Task Input */}
            <div className="flex gap-2 pl-4">
              <input
                type="text"
                value={newTitles[site.id] ?? ''}
                onChange={(e) => setNewTitles((prev) => ({ ...prev, [site.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addTodo(site.id)}
                placeholder="Add task..."
                className="flex-1 bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-700 focus:outline-none focus:border-ticker-500/50"
              />
              <button
                onClick={() => addTodo(site.id)}
                className="px-3 py-2 text-sm text-ticker-300 border border-ticker-500/30 rounded-lg hover:bg-ticker-500/10 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
