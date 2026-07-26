// ============================================================
// Content Script — Entry Point
// ============================================================

import { watchVisibility, watchSPANavigation } from './visibility';
import { injectFloatingTimer, updateFloatingTimer, removeFloatingTimer } from './floatingTimer';
import type { ExtensionMessage, TrackerState } from '@/types';

// Prevent double-injection
if (!(window as unknown as Record<string, unknown>)['__ticker_injected__']) {
  (window as unknown as Record<string, unknown>)['__ticker_injected__'] = true;
  init();
}

function init(): void {
  const syncTimer = () => {
    chrome.runtime.sendMessage({ type: 'SYNC_FLOATING_TIMER' });
  };

  // Watch page visibility
  watchVisibility((visible) => {
    if (visible) {
      syncTimer();
    } else {
      removeFloatingTimer();
    }
    chrome.runtime.sendMessage({ type: 'PAGE_VISIBILITY', payload: visible });
  });

  // Also sync when returning from another app (window focus)
  window.addEventListener('focus', () => {
    syncTimer();
  });

  // Watch SPA navigation
  watchSPANavigation((url) => {
    chrome.runtime.sendMessage({ type: 'SPA_NAVIGATION', payload: url });
  });

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    switch (message.type) {
      case 'PING':
        sendResponse({ alive: true });
        break;
      case 'INJECT_FLOATING_TIMER':
        injectFloatingTimer(message.payload as TrackerState);
        break;
      case 'REMOVE_FLOATING_TIMER':
        removeFloatingTimer();
        break;
      case 'UPDATE_FLOATING_TIMER':
        updateFloatingTimer(message.payload as TrackerState);
        break;
    }
  });
}
