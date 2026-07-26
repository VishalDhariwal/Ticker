// ============================================================
// Time Utilities
// ============================================================

/**
 * Formats seconds into HH:MM:SS
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats seconds into human-readable string like "2h 15m" or "45m"
 */
export function formatDurationHuman(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.floor(totalSeconds)}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

/**
 * Returns today's date as "YYYY-MM-DD"
 */
export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Returns an array of date strings for the last N days (most recent first)
 */
export function lastNDays(n: number, offsetDays: number = 0): string[] {
  const dates: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i - offsetDays);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Returns the ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Returns start of day (midnight) for a date string "YYYY-MM-DD"
 */
export function startOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}
