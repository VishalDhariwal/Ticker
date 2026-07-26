// ============================================================
// Background Service Worker — Entry Point
// ============================================================

import { storage } from '@/services/storage';
import {
  evaluateTracking,
  handleWindowFocusChange,
  handlePageVisibilityChange,
  handleIdleStateChange,
  handleTabChange,
  selectTodo,
  manualPause,
  manualResume,
  tickTimer,
  resetDailyTimers,
  getTrackerState,
  getDefaultSettings,
  syncTabFloatingTimer,
  disableSiteFloatingTimer,
} from './tracker';
import { setupAlarms, ALARM_TICK, ALARM_DAILY_RESET, scheduleDailyReset } from './alarms';
import type { ExtensionMessage } from '@/types';

// ============================================================
// First Install / Update
// ============================================================
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    // Set default settings
    const existingSettings = await storage.get('settings');
    if (!existingSettings) {
      await storage.set('settings', getDefaultSettings());
    }

    // Seed default tracked websites
    const existingSites = await storage.get('trackedSites');
    if (!existingSites || existingSites.length === 0) {
      await storage.set('trackedSites', [
        { id: 'site-1', domain: 'youtube.com', enabled: true, floatingTimer: true, rememberLastTodo: false, defaultTodoId: null, lastTodoId: null, color: '#ef4444' }
      ]);
    }

    if (!await storage.get('sessions')) {
      await storage.set('sessions', []);
    }
  }

  setupAlarms();
  await evaluateTracking();
});

// ============================================================
// Tab Events
// ============================================================
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await handleTabChange(tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    await handleTabChange(tabId);
  }
});

// ============================================================
// Window Focus
// ============================================================
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  await handleWindowFocusChange(windowId);
});

// ============================================================
// Idle Detection
// ============================================================
chrome.idle.onStateChanged.addListener(async (idleState) => {
  await handleIdleStateChange(idleState);
});

// Set idle detection interval from settings
(async () => {
  const settings = (await storage.get('settings')) ?? getDefaultSettings();
  chrome.idle.setDetectionInterval(settings.idleThresholdSeconds);
})();

// ============================================================
// Alarms (timer tick)
// ============================================================
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_TICK) {
    await tickTimer();
  }
  if (alarm.name === ALARM_DAILY_RESET) {
    // Reset all daily timers at 1 AM
    await resetDailyTimers();
    // Schedule the next 1 AM reset (for tomorrow)
    scheduleDailyReset();
  }
});


// ============================================================
// Message Passing
// ============================================================
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    handleMessage(message, _sender).then(sendResponse).catch((err) => {
      console.error('[Ticker SW] Message error:', err);
      sendResponse({ error: String(err) });
    });
    return true; // async response
  }
);

async function handleMessage(message: ExtensionMessage, _sender: chrome.runtime.MessageSender): Promise<unknown> {
  switch (message.type) {
    case 'GET_STATE':
      return getTrackerState();
    case 'MANUAL_PAUSE':
      await manualPause();
      return getTrackerState();
    case 'MANUAL_RESUME':
      await manualResume();
      return getTrackerState();
    case 'SELECT_TODO':
      await selectTodo((message.payload as string | null));
      return getTrackerState();
    case 'PAGE_VISIBILITY':
      await handlePageVisibilityChange(message.payload as boolean);
      return null;
    case 'SPA_NAVIGATION':
      await evaluateTracking(message.payload as string);
      return null;
    case 'SYNC_FLOATING_TIMER':
      if (_sender.tab?.id && _sender.tab.url) {
        await syncTabFloatingTimer(_sender.tab.id, _sender.tab.url);
      }
      return null;
    case 'REMOVE_FLOATING_TIMER':
      if (_sender.tab?.url) {
        await disableSiteFloatingTimer(_sender.tab.url);
      }
      return null;
    default:
      return null;
  }
}

// ============================================================
// Startup recovery
// ============================================================
chrome.runtime.onStartup.addListener(async () => {
  setupAlarms();
  await evaluateTracking();
});
