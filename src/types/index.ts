// ============================================================
// Ticker Extension — Shared Types
// ============================================================

export interface TrackedSite {
  id: string;
  domain: string;           // e.g. "github.com", "localhost:5173"
  enabled: boolean;
  floatingTimer: boolean;
  rememberLastTodo: boolean;
  defaultTodoId: string | null;
  lastTodoId: string | null; // remembered across sessions
  color: string;            // hex color for charts
}

export interface Todo {
  id: string;
  siteId: string;           // references TrackedSite.id
  title: string;
  createdAt: string;        // ISO 8601
}

export interface Session {
  id: string;
  website: string;          // domain string
  todoId: string | null;
  startTime: string;        // ISO 8601
  endTime: string | null;   // null = currently active
  duration: number;         // seconds (0 if still active)
}

export type PauseReason = 'idle' | 'hidden' | 'blur' | 'tab-switch' | 'manual' | null;

export interface TrackerState {
  isTracking: boolean;
  currentSite: string | null;       // domain
  currentSiteId: string | null;     // TrackedSite.id
  currentTodoId: string | null;
  sessionStart: number | null;      // Date.now() epoch ms
  accumulatedSeconds: number;       // within current pause-resume cycle
  totalTodaySeconds: number;        // for current site today
  pauseReason: PauseReason;
  activeSessionId: string | null;
  windowFocused: boolean;
  pageVisible: boolean;
  isIdle: boolean;
}

export interface Settings {
  trackAutomatically: boolean;
  pauseOnBlur: boolean;
  pauseOnIdle: boolean;
  idleThresholdSeconds: number;
  enableFloatingTimer: boolean;
  floatingTimerPosition: 'top-right' | 'bottom-right' | 'bottom-left';
  theme: 'dark' | 'light' | 'system';
}

export interface DailyStats {
  date: string;                            // "YYYY-MM-DD"
  byDomain: Record<string, number>;        // domain → total seconds
  byTodo: Record<string, number>;          // todoId → total seconds
}

export interface StorageSchema {
  trackerState: TrackerState;
  settings: Settings;
  trackedSites: TrackedSite[];
  todos: Todo[];
  sessions: Session[];
  floatingTimerPosition: { x: number; y: number } | null;
}

// Analytics computed types
export interface SiteStats {
  domain: string;
  totalSeconds: number;
  sessionCount: number;
  avgSessionSeconds: number;
  tasks: { todoId: string; totalSeconds: number }[];
}

export interface DailyBreakdown {
  date: string;
  totalSeconds: number;
  sites: SiteStats[];
}

export type MessageType =
  | 'PAGE_VISIBILITY'
  | 'SPA_NAVIGATION'
  | 'SELECT_TODO'
  | 'MANUAL_PAUSE'
  | 'MANUAL_RESUME'
  | 'GET_STATE'
  | 'STATE_UPDATE'
  | 'UPDATE_FLOATING_TIMER'
  | 'INJECT_FLOATING_TIMER'
  | 'REMOVE_FLOATING_TIMER'
  | 'SYNC_FLOATING_TIMER'
  | 'PING';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}
