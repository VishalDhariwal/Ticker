// ============================================================
// Tracker — Core Tracking State Machine
// ============================================================

import { storage } from '@/services/storage';
import { findMatchingSite, extractDomain } from '@/utils/domain';
import { openSession, closeSession, updateSessionTodo } from './session';
import type { TrackerState, TrackedSite, Settings } from '@/types';

const DEFAULT_STATE: TrackerState = {
  isTracking: false,
  currentSite: null,
  currentSiteId: null,
  currentTodoId: null,
  sessionStart: null,
  accumulatedSeconds: 0,
  totalTodaySeconds: 0,
  pauseReason: null,
  activeSessionId: null,
  windowFocused: true,
  pageVisible: true,
  isIdle: false,
};

export function getDefaultSettings(): Settings {
  return {
    trackAutomatically: true,
    pauseOnBlur: true,
    pauseOnIdle: false,
    idleThresholdSeconds: 60,
    enableFloatingTimer: true,
    floatingTimerPosition: 'bottom-right',
    theme: 'dark',
  };
}

export async function getTrackerState(): Promise<TrackerState> {
  return (await storage.get('trackerState')) ?? { ...DEFAULT_STATE };
}

async function saveState(state: TrackerState): Promise<void> {
  await storage.set('trackerState', state);
}

/**
 * Evaluates all tracking conditions and starts/pauses as needed.
 */
export async function evaluateTracking(activeTabUrl?: string): Promise<void> {
  const state = await getTrackerState();
  const settings = (await storage.get('settings')) ?? getDefaultSettings();
  const sites = (await storage.get('trackedSites')) ?? [];

  let currentUrl = activeTabUrl;
  if (!currentUrl) {
    currentUrl = await getActiveTabUrl();
  }

  // Never track incognito tabs
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.incognito) {
    if (state.isTracking) await pauseTracking(state, 'manual');
    return;
  }

  const domain = currentUrl ? extractDomain(currentUrl) : null;
  const matchedSite = (domain && currentUrl) ? findMatchingSite(currentUrl, sites) : null;

  const shouldTrack =
    matchedSite !== null &&
    matchedSite.enabled &&
    (settings.pauseOnBlur ? (state.windowFocused && state.pageVisible) : true) &&
    !state.isIdle &&
    state.pauseReason !== 'manual';

  const siteChanged = domain !== state.currentSite;
  let isTrackingNow = state.isTracking;

  if (state.isTracking && (siteChanged || !shouldTrack)) {
    await pauseTracking(state, siteChanged ? 'tab-switch' : 'blur');
    isTrackingNow = false;
    if (!shouldTrack) return;
  }

  if (!isTrackingNow && shouldTrack) {
    if (siteChanged && !settings.trackAutomatically) {
      const freshState = await getTrackerState();
      const manualState = {
        ...freshState,
        currentSite: domain!,
        currentSiteId: matchedSite!.id,
        currentTodoId: null,
        isTracking: false,
        pauseReason: 'manual' as const,
      };
      await saveState(manualState);
      broadcastStateUpdate(manualState);
      return;
    }

    // Re-read state after potential pause above
    const freshState = await getTrackerState();
    await startTracking(freshState, domain!, matchedSite!, settings);
  } else if (isTrackingNow && shouldTrack) {
    // Tracking continues seamlessly, but the active tab might have changed.
    // Broadcast state to ensure the newly activated tab shows the floating timer.
    broadcastStateUpdate(state);
  }
}

async function startTracking(
  state: TrackerState,
  domain: string,
  site: TrackedSite,
  settings: Settings
): Promise<void> {
  // The user requested to never remember the last task.
  // We will always start a new session without a task selected.
  let todoId: string | null = null;

  const sessionId = await openSession(domain, todoId);
  const todaySeconds = await getTodaySecondsForDomain(domain);
  const todaySecondsForTodo = todoId ? await getTodaySecondsForTodo(todoId) : 0;

  const newState: TrackerState = {
    ...state,
    isTracking: true,
    currentSite: domain,
    currentSiteId: site.id,
    currentTodoId: todoId,
    sessionStart: Date.now(),
    accumulatedSeconds: 0,
    totalTodaySeconds: todaySeconds,
    totalTodaySecondsForTodo: todaySecondsForTodo,
    pauseReason: null,
    activeSessionId: sessionId,
  };

  await saveState(newState);
  broadcastStateUpdate(newState);
}

async function pauseTracking(
  state: TrackerState,
  reason: TrackerState['pauseReason']
): Promise<void> {
  if (!state.isTracking) return;

  if (state.activeSessionId) {
    await closeSession(state.activeSessionId);
  }

  const newState: TrackerState = {
    ...state,
    isTracking: false,
    sessionStart: null,
    accumulatedSeconds: 0,
    activeSessionId: null,
    pauseReason: reason,
  };

  await saveState(newState);
  broadcastStateUpdate(newState);
}

// ---- Public control methods ----

export async function handleWindowFocusChange(windowId: number): Promise<void> {
  const state = await getTrackerState();
  const focused = windowId !== chrome.windows.WINDOW_ID_NONE;
  const newState = { ...state, windowFocused: focused };
  await saveState(newState);
  await evaluateTracking();
}

export async function handlePageVisibilityChange(visible: boolean): Promise<void> {
  const state = await getTrackerState();
  const newState = { ...state, pageVisible: visible };
  await saveState(newState);
  await evaluateTracking();
}

export async function handleIdleStateChange(idleState: chrome.idle.IdleState): Promise<void> {
  const settings = (await storage.get('settings')) ?? getDefaultSettings();
  if (!settings.pauseOnIdle) return;
  const state = await getTrackerState();
  const isIdle = idleState === 'idle' || idleState === 'locked';
  const newState = { ...state, isIdle };
  await saveState(newState);
  await evaluateTracking();
}

export async function handleTabChange(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab?.url) return;

  const sites = (await storage.get('trackedSites')) ?? [];
  const matchedSite = findMatchingSite(tab.url, sites);

  if (matchedSite) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    } catch {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content/content.js'],
        });
      } catch {
        // Failed to inject
      }
    }
  }

  // When a tab is activated, it is guaranteed to be visible.
  // This acts as a fallback if content.js PAGE_VISIBILITY message is delayed or orphaned.
  const state = await getTrackerState();
  if (!state.pageVisible) {
    await saveState({ ...state, pageVisible: true });
  }

  await evaluateTracking(tab.url);
}

export async function selectTodo(todoId: string | null): Promise<void> {
  const state = await getTrackerState();
  const newState = { ...state, currentTodoId: todoId };
  await saveState(newState);
  if (state.activeSessionId) {
    await updateSessionTodo(state.activeSessionId, todoId);
  }
  broadcastStateUpdate(newState);
}

export async function manualPause(): Promise<void> {
  const state = await getTrackerState();
  if (state.isTracking) await pauseTracking(state, 'manual');
}

export async function manualResume(): Promise<void> {
  const state = await getTrackerState();
  const newState = { ...state, pauseReason: null };
  await saveState(newState);
  await evaluateTracking();
}

export async function tickTimer(): Promise<void> {
  const state = await getTrackerState();
  if (!state.isTracking || !state.sessionStart) return;

  // Elapsed seconds in the current active session
  const currentElapsed = Math.floor((Date.now() - state.sessionStart) / 1000);

  // Total today = all completed sessions for this site today
  const completedToday = await getTodaySecondsForDomain(state.currentSite!);
  const totalTodaySeconds = completedToday; // Do not add currentElapsed to avoid double counting in frontend

  const newState = {
    ...state,
    accumulatedSeconds: currentElapsed,
    totalTodaySeconds,
  };
  await saveState(newState);
  broadcastStateUpdate(newState);
}

/**
 * Called at 1 AM daily — resets today's timer display to 0 for all sites.
 * Historical sessions are kept; only the live state counter is cleared.
 */
export async function resetDailyTimers(): Promise<void> {
  const state = await getTrackerState();
  // Close any active session first
  if (state.isTracking && state.activeSessionId) {
    await closeSession(state.activeSessionId);
  }

  // Auto-delete sessions older than 30 days to save storage space
  const sessions = (await storage.get('sessions')) ?? [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentSessions = sessions.filter((s: Session) => new Date(s.startTime) >= thirtyDaysAgo);
  if (recentSessions.length !== sessions.length) {
    await storage.set('sessions', recentSessions);
  }
  const newState: TrackerState = {
    ...state,
    isTracking: false,
    sessionStart: null,
    accumulatedSeconds: 0,
    totalTodaySeconds: 0,
    activeSessionId: null,
    pauseReason: null,
  };
  await saveState(newState);
  broadcastStateUpdate(newState);
  // Re-evaluate so tracking resumes if the tab is still open
  await evaluateTracking();
}

// ---- Helpers ----

async function getActiveTabUrl(): Promise<string | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url;
}

async function getTodaySecondsForDomain(domain: string): Promise<number> {
  // Use local date (not UTC) so midnight resets at the user's actual midnight
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const sessions = (await storage.get('sessions')) ?? [];
  return sessions
    .filter((s) => {
      const sessionDate = new Date(s.startTime);
      const localDate = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;
      return s.website === domain && localDate === localToday && s.endTime !== null;
    })
    .reduce((acc, s) => acc + s.duration, 0);
}

async function broadcastStateUpdate(state: TrackerState): Promise<void> {
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', payload: state }).catch(() => {
    // Popup closed — ignore
  });

  try {
    const settings = (await storage.get('settings')) ?? getDefaultSettings();
    const sites = (await storage.get('trackedSites')) ?? [];

    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      const domain = extractDomain(tab.url);
      const matchedSite = domain ? findMatchingSite(tab.url, sites) : null;

      const showFloatingTimer =
        settings.enableFloatingTimer &&
        matchedSite?.floatingTimer &&
        state.isTracking &&
        state.currentSite === domain;

      if (showFloatingTimer) {
        const currentElapsed = state.sessionStart ? Math.floor((Date.now() - state.sessionStart) / 1000) : 0;
        const payload = {
          ...state,
          accumulatedSeconds: state.totalTodaySeconds + currentElapsed
        };
        chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_FLOATING_TIMER', payload }).catch(() => { });
      } else {
        chrome.tabs.sendMessage(tab.id, { type: 'REMOVE_FLOATING_TIMER' }).catch(() => { });
      }
    }
  } catch (err) {
    // Ignore error
  }
}

export async function syncTabFloatingTimer(tabId: number, url: string): Promise<void> {
  try {
    const state = await getTrackerState();
    const settings = (await storage.get('settings')) ?? getDefaultSettings();
    const sites = (await storage.get('trackedSites')) ?? [];

    const domain = extractDomain(url);
    const matchedSite = domain ? findMatchingSite(url, sites) : null;

    const showFloatingTimer =
      settings.enableFloatingTimer &&
      matchedSite?.floatingTimer &&
      state.isTracking &&
      state.currentSite === domain;

    if (showFloatingTimer) {
      const currentElapsed = state.sessionStart ? Math.floor((Date.now() - state.sessionStart) / 1000) : 0;
      const payload = {
        ...state,
        accumulatedSeconds: state.totalTodaySeconds + currentElapsed
      };
      await chrome.tabs.sendMessage(tabId, { type: 'UPDATE_FLOATING_TIMER', payload }).catch(() => { });
    } else {
      await chrome.tabs.sendMessage(tabId, { type: 'REMOVE_FLOATING_TIMER' }).catch(() => { });
    }
  } catch (err) {
    // Ignore error
  }
}

export async function disableSiteFloatingTimer(url: string): Promise<void> {
  try {
    const sites = (await storage.get('trackedSites')) ?? [];
    const matchedSite = findMatchingSite(url, sites);
    
    if (matchedSite) {
      const updatedSites = sites.map(s => 
        s.id === matchedSite.id ? { ...s, floatingTimer: false } : s
      );
      await storage.set('trackedSites', updatedSites);
    }
  } catch (err) {
    // Ignore error
  }
}
