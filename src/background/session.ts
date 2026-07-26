// ============================================================
// Session Manager — Creates and closes work sessions
// ============================================================

import { storage } from '@/services/storage';
import type { Session } from '@/types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function openSession(domain: string, todoId: string | null): Promise<string> {
  const session: Session = {
    id: generateId(),
    website: domain,
    todoId,
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0,
  };

  const sessions = (await storage.get('sessions')) ?? [];
  sessions.push(session);
  await storage.set('sessions', sessions);

  return session.id;
}

export async function closeSession(sessionId: string): Promise<void> {
  const sessions = (await storage.get('sessions')) ?? [];
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return;

  const session = sessions[idx];
  const endTime = new Date().toISOString();
  const start = new Date(session.startTime).getTime();
  const end = new Date(endTime).getTime();
  const duration = Math.round((end - start) / 1000);

  sessions[idx] = {
    ...session,
    endTime,
    duration,
  };

  await storage.set('sessions', sessions);
}

export async function updateSessionTodo(sessionId: string, todoId: string | null): Promise<void> {
  const sessions = (await storage.get('sessions')) ?? [];
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return;
  sessions[idx] = { ...sessions[idx], todoId };
  await storage.set('sessions', sessions);
}

export async function getSessionsForToday(): Promise<Session[]> {
  const sessions = (await storage.get('sessions')) ?? [];
  const today = new Date().toISOString().split('T')[0];
  return sessions.filter((s) => s.startTime.startsWith(today));
}
