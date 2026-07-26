// ============================================================
// Export / Import Utilities
// ============================================================

import type { Session, StorageSchema } from '@/types';

export function exportToJSON(data: Partial<StorageSchema>): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2);
}

export function exportToCSV(sessions: Session[]): string {
  const header = 'website,todo_id,start_time,end_time,duration_seconds\n';
  const rows = sessions
    .filter((s) => s.endTime !== null)
    .map((s) => `${s.website},${s.todoId ?? ''},${s.startTime},${s.endTime},${s.duration}`)
    .join('\n');
  return header + rows;
}

export function importFromJSON(raw: string): Partial<StorageSchema> {
  try {
    const parsed = JSON.parse(raw);
    const result: Partial<StorageSchema> = {};

    // Handle legacy/CSV-to-JSON format which is just an array of sessions
    if (Array.isArray(parsed)) {
      result.sessions = parsed.map((item: any, i: number) => ({
        id: item.id || `imported-${Date.now()}-${i}`,
        website: item.website || '',
        todoId: item.todo_id ?? item.todoId ?? null,
        startTime: item.start_time ?? item.startTime ?? new Date().toISOString(),
        endTime: item.end_time ?? item.endTime ?? null,
        duration: item.duration_seconds ?? item.duration ?? 0,
      }));
      return result;
    }

    // Basic validation for standard export format
    if (Array.isArray(parsed.sessions)) result.sessions = parsed.sessions as StorageSchema['sessions'];
    if (Array.isArray(parsed.trackedSites)) result.trackedSites = parsed.trackedSites as StorageSchema['trackedSites'];
    if (Array.isArray(parsed.todos)) result.todos = parsed.todos as StorageSchema['todos'];
    if (parsed.settings && typeof parsed.settings === 'object') result.settings = parsed.settings as StorageSchema['settings'];
    return result;
  } catch {
    throw new Error('Invalid JSON file');
  }
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
