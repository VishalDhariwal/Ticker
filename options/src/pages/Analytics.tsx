// ============================================================
// Analytics Page
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { getTopSites, getDailyBreakdowns, getFocusSessions, getTodayTotal } from '@/utils/analytics';
import { useTrackerState } from '@/hooks/useTrackerState';
import { formatDurationHuman, formatDuration, lastNDays } from '@/utils/time';
import type { Session, TrackedSite, Todo } from '@/types';

type Range = 'today' | 'week' | 'month';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#06b6d4', '#64748b'];

export function AnalyticsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sites, setSites] = useState<TrackedSite[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [range, setRange] = useState<Range>('today');
  const [weekOffset, setWeekOffset] = useState(0);
  const trackerState = useTrackerState();

  useEffect(() => {
    chrome.storage.local.get(['sessions', 'trackedSites', 'todos'], (result) => {
      setSessions((result.sessions ?? []) as Session[]);
      setSites((result.trackedSites ?? []) as TrackedSite[]);
      setTodos((result.todos ?? []) as Todo[]);
    });
  }, []);

  const mergedSessions = useMemo(() => {
    // If there is an active session, update its duration with the live elapsed time
    if (!trackerState.isTracking || !trackerState.activeSessionId) return sessions;
    return sessions.map(s => {
      if (s.id === trackerState.activeSessionId) {
        return { ...s, duration: trackerState.accumulatedSeconds };
      }
      return s;
    });
  }, [sessions, trackerState]);

  const filteredSessions = useMemo(() => {
    const now = new Date();
    const from = new Date();
    if (range === 'today') from.setHours(0, 0, 0, 0);
    else if (range === 'week') from.setDate(now.getDate() - 7);
    else if (range === 'month') from.setDate(now.getDate() - 30);
    else from.setFullYear(2000);

    // Also include the currently active session (endTime === null) if it's within the range
    return mergedSessions.filter((s) => 
      new Date(s.startTime) >= from && (s.endTime !== null || s.id === trackerState.activeSessionId)
    );
  }, [mergedSessions, range, trackerState.activeSessionId]);

  const topSites = useMemo(() => getTopSites(filteredSessions), [filteredSessions]);
  const focusSessions = useMemo(() => getFocusSessions(filteredSessions), [filteredSessions]);
  const rangeTotal = useMemo(() => filteredSessions.reduce((acc, s) => acc + s.duration, 0), [filteredSessions]);

  // Daily chart data (last 7 days, with offset)
  const dailyData = useMemo(() => {
    const days = lastNDays(7, weekOffset * 7).reverse();
    const breakdowns = getDailyBreakdowns(mergedSessions, days);
    return breakdowns.map((d) => ({
      date: new Date(d.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }),
      minutes: Math.round(d.totalSeconds / 60),
      totalSeconds: d.totalSeconds,
      sites: d.sites,
    }));
  }, [mergedSessions, weekOffset]);

  const maxBar = Math.max(...dailyData.map((d) => d.minutes), 1);

  const getSiteColor = (domain: string) => {
    const site = sites.find((s) => s.domain === domain);
    return site?.color ?? COLORS[0];
  };

  const yAxisFormatter = (minutes: number) => {
    if (minutes === 0) return '0';
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1f1f22] border border-white/10 rounded-xl p-3 shadow-xl backdrop-blur-md min-w-[160px]">
          <p className="text-slate-300 font-semibold mb-2">{label}</p>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-ticker-500" />
            <span className="text-slate-400 text-sm">Total:</span>
            <span className="text-white font-mono-ticker font-medium">
              {formatDurationHuman(data.totalSeconds)}
            </span>
          </div>
          {data.sites && data.sites.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">Top Sites</p>
              {data.sites.slice(0, 3).map((site: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-xs gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getSiteColor(site.domain) }} />
                    <span className="text-slate-300">{site.domain}</span>
                  </div>
                  <span className="font-mono-ticker text-slate-400">
                    {formatDurationHuman(site.totalSeconds)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Your local productivity data</p>
        </div>
        {/* Range Selector */}
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as Range)}
          className="bg-surface-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 focus:outline-none focus:border-ticker-500/50 cursor-pointer"
        >
          <option value="today">Today</option>
          <option value="week">7 Days</option>
          <option value="month">30 Days</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">
            {range === 'today' ? 'Today' : range === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
          </div>
          <div className="text-3xl font-bold text-white font-mono-ticker">{formatDurationHuman(rangeTotal)}</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Sites</div>
          <div className="text-3xl font-bold text-white font-mono-ticker">{topSites.length}</div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300">
            {weekOffset === 0 ? 'Last 7 Days' : `${weekOffset} Week${weekOffset > 1 ? 's' : ''} Ago`}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => setWeekOffset(Math.min(3, weekOffset + 1))}
              disabled={weekOffset >= 3}
              className="p-1 rounded hover:bg-white/10 text-slate-400 disabled:opacity-30 transition-colors"
              title="Previous Week"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button
              onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
              disabled={weekOffset === 0}
              className="p-1 rounded hover:bg-white/10 text-slate-400 disabled:opacity-30 transition-colors"
              title="Next Week"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              tickFormatter={yAxisFormatter}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
            <Bar dataKey="minutes" radius={[6, 6, 0, 0]} activeBar={{ fill: '#6366f1' }}>
              {dailyData.map((_, i) => {
                const isToday = weekOffset === 0 && i === dailyData.length - 1;
                return (
                  <Cell key={i} fill={isToday ? '#6366f1' : '#312e81'} style={{ transition: 'all 0.3s ease' }} />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Sites */}
      {topSites.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Top Sites</h2>
          <div className="space-y-3">
            {topSites.map((site, i) => {
              const pct = maxBar > 0 ? (site.totalSeconds / 60 / maxBar) * 100 : 0;
              const color = getSiteColor(site.domain);
              return (
                <div key={site.domain} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-slate-300 font-medium">{site.domain}</span>
                      <span className="text-xs text-slate-600">{site.sessionCount} sessions</span>
                    </div>
                    <span className="font-mono-ticker text-slate-300 text-sm font-semibold">{formatDurationHuman(site.totalSeconds)}</span>
                  </div>
                  <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  {site.tasks && site.tasks.length > 0 && (
                    <div className="pl-4 mt-2 space-y-1.5 border-l border-white/10 ml-1">
                      {site.tasks.map(task => {
                        const todo = todos.find(t => t.id === task.todoId);
                        const title = todo ? todo.title : 'Deleted Task';
                        return (
                          <div key={task.todoId} className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 truncate max-w-[250px]">{title}</span>
                            <span className="font-mono-ticker text-slate-500">{formatDurationHuman(task.totalSeconds)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Focus Sessions */}
      {focusSessions.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-1">Focus Sessions</h2>
          <p className="text-xs text-slate-600 mb-4">Sessions longer than 25 minutes</p>
          <div className="space-y-2">
            {focusSessions.slice(0, 8).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: getSiteColor(s.website) }} />
                  <div>
                    <div className="text-sm text-slate-300">{s.website}</div>
                    <div className="text-xs text-slate-600">{new Date(s.startTime).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="font-mono-ticker text-ticker-400 text-sm">{formatDurationHuman(s.duration)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-slate-400 font-medium">No data yet</p>
          <p className="text-slate-600 text-sm mt-2">Start tracking websites to see your analytics here</p>
        </div>
      )}
    </div>
  );
}
