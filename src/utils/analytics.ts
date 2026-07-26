// ============================================================
// Analytics — Compute statistics from sessions
// ============================================================

import type { Session, SiteStats, DailyBreakdown } from '@/types';

export function getStatsForRange(sessions: Session[], from: Date, to: Date): Session[] {
  return sessions.filter((s) => {
    const start = new Date(s.startTime);
    return start >= from && start <= to && s.endTime !== null;
  });
}

export function getTotalByDomain(sessions: Session[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const s of sessions) {
    if (s.endTime === null) continue;
    result[s.website] = (result[s.website] ?? 0) + s.duration;
  }
  return result;
}

export function getTopSites(sessions: Session[], limit = 10): SiteStats[] {
  const byDomain: Record<string, { total: number; count: number; tasks: Record<string, number> }> = {};
  for (const s of sessions) {
    if (s.endTime === null) continue;
    if (!byDomain[s.website]) byDomain[s.website] = { total: 0, count: 0, tasks: {} };
    byDomain[s.website].total += s.duration;
    byDomain[s.website].count += 1;
    if (s.todoId) {
      byDomain[s.website].tasks[s.todoId] = (byDomain[s.website].tasks[s.todoId] ?? 0) + s.duration;
    }
  }
  return Object.entries(byDomain)
    .map(([domain, { total, count, tasks }]) => ({
      domain,
      totalSeconds: total,
      sessionCount: count,
      avgSessionSeconds: count > 0 ? Math.round(total / count) : 0,
      tasks: Object.entries(tasks)
        .map(([todoId, totalSeconds]) => ({ todoId, totalSeconds }))
        .sort((a, b) => b.totalSeconds - a.totalSeconds),
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, limit);
}

export function groupByDay(sessions: Session[]): Record<string, Session[]> {
  const result: Record<string, Session[]> = {};
  for (const s of sessions) {
    const day = s.startTime.split('T')[0];
    if (!result[day]) result[day] = [];
    result[day].push(s);
  }
  return result;
}

export function getDailyBreakdowns(sessions: Session[], days: string[]): DailyBreakdown[] {
  const grouped = groupByDay(sessions);
  return days.map((date) => {
    const daySessions = grouped[date] ?? [];
    const sites = getTopSites(daySessions);
    const totalSeconds = sites.reduce((acc, s) => acc + s.totalSeconds, 0);
    return { date, totalSeconds, sites };
  });
}

export function getTodayTotal(sessions: Session[]): number {
  const today = new Date().toISOString().split('T')[0];
  return sessions
    .filter((s) => s.startTime.startsWith(today) && s.endTime !== null)
    .reduce((acc, s) => acc + s.duration, 0);
}

export function getFocusSessions(sessions: Session[], minMinutes = 25): Session[] {
  return sessions
    .filter((s) => s.endTime !== null && s.duration >= minMinutes * 60)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}
