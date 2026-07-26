// ============================================================
// Hook — Live tracker state + computed live timer
// ============================================================

import { useState, useEffect } from 'react';
import type { TrackerState } from '@/types';

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

export interface LiveTrackerState extends TrackerState {
  /**
   * Live display seconds — totalTodaySeconds from storage plus
   * the seconds elapsed in the current active session since sessionStart.
   * Updates every second in the UI without waiting for the background alarm.
   */
  liveSeconds: number;
}

export function useTrackerState(): LiveTrackerState {
  const [state, setState] = useState<TrackerState>(DEFAULT_STATE);
  const [liveSeconds, setLiveSeconds] = useState(0);

  // Load state from storage and listen for background updates
  useEffect(() => {
    chrome.storage.local.get('trackerState', (result) => {
      if (result.trackerState) setState(result.trackerState as TrackerState);
    });

    const listener = (message: { type: string; payload?: TrackerState }) => {
      if (message.type === 'STATE_UPDATE' && message.payload) {
        setState(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  // Tick every second — compute live total without needing the background alarm
  useEffect(() => {
    const compute = () => {
      if (state.isTracking && state.sessionStart) {
        const currentElapsed = Math.floor((Date.now() - state.sessionStart) / 1000);
        setLiveSeconds(state.totalTodaySeconds + currentElapsed);
      } else {
        // Not tracking — show the stored total (completed sessions today)
        setLiveSeconds(state.totalTodaySeconds);
      }
    };

    compute(); // Run immediately

    // Sync to the exact second boundary so popup and floating timer tick simultaneously
    let interval: ReturnType<typeof setInterval>;
    const now = Date.now();
    const delay = 1000 - (now % 1000);
    const timeout = setTimeout(() => {
      compute();
      interval = setInterval(compute, 1000);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [state.isTracking, state.sessionStart, state.totalTodaySeconds]);

  return { ...state, liveSeconds };
}
