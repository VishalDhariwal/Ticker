// ============================================================
// Hook — Settings read/write
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '@/types';

const DEFAULT_SETTINGS: Settings = {
  trackAutomatically: true,
  pauseOnBlur: true,
  pauseOnIdle: false,
  idleThresholdSeconds: 60,
  enableFloatingTimer: true,
  floatingTimerPosition: 'bottom-right',
  theme: 'dark',
};

export function useSettings(): {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  loading: boolean;
} {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get('settings', (result) => {
      if (result.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...(result.settings as Settings) });
      }
      setLoading(false);
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      chrome.storage.local.set({ settings: next });
      return next;
    });
  }, []);

  return { settings, updateSettings, loading };
}
