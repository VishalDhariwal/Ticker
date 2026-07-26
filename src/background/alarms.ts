// ============================================================
// Alarms — Chrome alarm scheduling
// ============================================================

export const ALARM_TICK = 'ticker-tick';
export const ALARM_DAILY_RESET = 'ticker-daily-reset';

export function setupAlarms(): void {
  // Tick alarm — fires roughly every 30s (Chrome MV3 minimum).
  // The popup computes live seconds client-side every second;
  // the alarm just keeps the stored state in sync for background accuracy.
  chrome.alarms.create(ALARM_TICK, {
    periodInMinutes: 0.5, // 30 seconds — Chrome's MV3 minimum
  });

  // Daily reset at 1:00 AM local time
  scheduleDailyReset();
}

/**
 * Schedules the next midnight alarm.
 * Called on install, startup, and each time the reset fires.
 */
export function scheduleDailyReset(): void {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0, 0, 0, 0  // 00:00:00 (Midnight) today
  );

  // If midnight has already passed today (which it always has unless it's exactly 00:00:00.000), 
  // schedule for tomorrow
  if (nextMidnight.getTime() <= now.getTime()) {
    nextMidnight.setDate(nextMidnight.getDate() + 1);
  }

  const delayMinutes = (nextMidnight.getTime() - now.getTime()) / 60000;

  chrome.alarms.create(ALARM_DAILY_RESET, {
    delayInMinutes: delayMinutes,
    // periodInMinutes: 1440, // 24 hours — re-scheduled manually after each fire
  });
}

export function clearAlarms(): void {
  chrome.alarms.clearAll();
}
