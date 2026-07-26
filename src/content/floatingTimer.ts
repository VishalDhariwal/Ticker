// ============================================================
// Floating Timer Widget (optional)
// ============================================================

import { formatDuration } from '@/utils/time';
import type { TrackerState } from '@/types';

const WIDGET_ID = 'ticker-floating-widget';
let currentTrackerState: TrackerState | null = null;
let tickTimeout: number | null = null;
let tickInterval: number | null = null;

// Cleanup orphaned intervals from previous script injections (e.g. extension reload)
window.addEventListener('ticker-cleanup-intervals', () => {
  if (tickTimeout) {
    window.clearTimeout(tickTimeout);
    tickTimeout = null;
  }
  if (tickInterval) {
    window.clearInterval(tickInterval);
    tickInterval = null;
  }
});

export function injectFloatingTimer(state: TrackerState): void {
  window.dispatchEvent(new CustomEvent('ticker-cleanup-intervals'));

  currentTrackerState = state;
  let widget = document.getElementById(WIDGET_ID);

  if (!widget) {
    widget = document.createElement('div');
    widget.id = WIDGET_ID;
    widget.innerHTML = buildWidgetHTML();
    applyWidgetStyles(widget);

    document.body.appendChild(widget);
    makeDraggable(widget);
    restorePosition(widget);
  }

  updateDOM();

  if (!tickInterval) {
    const now = Date.now();
    const delay = 1000 - (now % 1000);
    tickTimeout = window.setTimeout(() => {
      updateDOM();
      tickInterval = window.setInterval(() => {
        updateDOM();
      }, 1000);
    }, delay);
  }
}

export function updateFloatingTimer(state: TrackerState): void {
  currentTrackerState = state;
  const widget = document.getElementById(WIDGET_ID);
  if (!widget) {
    injectFloatingTimer(state);
    return;
  }
  updateDOM();
}

export function removeFloatingTimer(): void {
  document.getElementById(WIDGET_ID)?.remove();
  if (tickTimeout) {
    clearTimeout(tickTimeout);
    tickTimeout = null;
  }
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  currentTrackerState = null;
}

function updateDOM(): void {
  if (!currentTrackerState) return;
  const widget = document.getElementById(WIDGET_ID);
  if (!widget) return;

  const timer = widget.querySelector('#ticker-timer');
  const badge = widget.querySelector('#ticker-badge');

  if (timer) {
    let liveSeconds = currentTrackerState.accumulatedSeconds; // Default from background
    if (currentTrackerState.isTracking && currentTrackerState.sessionStart) {
      const elapsed = Math.floor((Date.now() - currentTrackerState.sessionStart) / 1000);
      liveSeconds = currentTrackerState.totalTodaySeconds + elapsed;
    }
    timer.textContent = formatDuration(liveSeconds);
  }

  if (badge) {
    badge.className = `ticker-badge ${currentTrackerState.isTracking ? 'tracking' : 'paused'}`;
  }
}

function buildWidgetHTML(): string {
  return `
    <div class="ticker-content">
      <span id="ticker-badge" class="ticker-badge"></span>
      <span id="ticker-timer" class="ticker-timer">00:00</span>
    </div>
    <div class="ticker-divider"></div>
    <button id="ticker-close" class="ticker-close" title="Hide timer">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M9.5 2.5L2.5 9.5M2.5 2.5L9.5 9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  `;
}

function applyWidgetStyles(widget: HTMLElement): void {
  const style = document.createElement('style');
  style.textContent = `
    #ticker-floating-widget {
      position: fixed;
      z-index: 2147483647;
      background: rgba(24, 24, 27, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 6px 8px 6px 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'JetBrains Mono', 'Inter', system-ui, sans-serif;
      color: #e2e8f0;
      cursor: move;
      user-select: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .ticker-content { display: flex; align-items: center; gap: 8px; }
    .ticker-badge { width: 6px; height: 6px; border-radius: 50%; }
    .ticker-badge.tracking { background-color: #10b981; box-shadow: 0 0 4px #10b981; }
    .ticker-badge.paused { background-color: #6b7280; }
    .ticker-timer { font-size: 13px; font-weight: 600; letter-spacing: 0.5px; line-height: 1; margin-top: 1px; color: #e2e8f0; }
    .ticker-divider { width: 1px; height: 12px; background: rgba(255,255,255,0.15); }
    .ticker-close { 
      background: none; border: none; color: #94a3b8; cursor: pointer; 
      padding: 4px; display: flex; align-items: center; justify-content: center;
      border-radius: 4px; transition: all 0.15s ease; outline: none;
    }
    .ticker-close:hover { color: #f87171; background: rgba(255,255,255,0.1); }
  `;
  document.head.appendChild(style);

  // Position will be set by restorePosition
}

function makeDraggable(widget: HTMLElement): void {
  let isDragging = false;
  let startX = 0, startY = 0, initialX = 0, initialY = 0;

  const close = widget.querySelector('#ticker-close') as HTMLElement;
  close?.addEventListener('click', (e) => {
    e.stopPropagation();
    removeFloatingTimer();
    chrome.runtime.sendMessage({ type: 'REMOVE_FLOATING_TIMER' });
  });

  widget.addEventListener('pointerdown', (e) => {
    const target = e.target as HTMLElement;
    if (target && typeof target.closest === 'function' && target.closest('#ticker-close')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = widget.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    widget.setPointerCapture(e.pointerId);
  });

  widget.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    widget.style.left = `${initialX + dx}px`;
    widget.style.top = `${initialY + dy}px`;
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
  });

  widget.addEventListener('pointerup', (e) => {
    if (isDragging) {
      isDragging = false;
      savePosition(widget);
      widget.releasePointerCapture(e.pointerId);
    }
  });
}

function savePosition(widget: HTMLElement): void {
  const rect = widget.getBoundingClientRect();
  chrome.storage.local.set({ floatingTimerPosition: { x: rect.left, y: rect.top } });
}

function restorePosition(widget: HTMLElement): void {
  chrome.storage.local.get(['floatingTimerPosition', 'settings'], (result) => {
    const pos = result.floatingTimerPosition as { x: number; y: number } | null;
    if (pos) {
      widget.style.left = `${pos.x}px`;
      widget.style.top = `${pos.y}px`;
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
    } else {
      const defaultPos = result.settings?.floatingTimerPosition || 'bottom-right';
      widget.style.left = 'auto';
      widget.style.top = 'auto';
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
      
      if (defaultPos === 'top-right') {
        widget.style.top = '24px';
        widget.style.right = '24px';
      } else if (defaultPos === 'bottom-left') {
        widget.style.bottom = '24px';
        widget.style.left = '24px';
      } else {
        // bottom-right
        widget.style.bottom = '24px';
        widget.style.right = '24px';
      }
    }
  });
}
