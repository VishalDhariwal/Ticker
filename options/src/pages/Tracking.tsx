// ============================================================
// Tracking Settings Page
// ============================================================

import { useSettings } from '@/hooks/useSettings';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${checked ? 'bg-ticker-600' : 'bg-surface-700'}`}
      style={{ height: '22px', minWidth: '40px' }}
    >
      <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        style={{ width: '18px', height: '18px' }}
      />
    </button>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
      <div className="flex-1 pr-8">
        <div className="text-sm font-medium text-slate-200">{label}</div>
        {description && <div className="text-xs text-slate-600 mt-0.5">{description}</div>}
      </div>
      {children}
    </div>
  );
}

export function TrackingPage() {
  const { settings, updateSettings, loading } = useSettings();
  if (loading) return <div className="p-8 text-slate-600">Loading…</div>;

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure how Ticker tracks your time</p>
      </div>

      {/* Tracking Behavior */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Tracking</h2>
        <SettingRow label="Track automatically" description="Start timing when you open a tracked website">
          <Toggle checked={settings.trackAutomatically} onChange={(v) => updateSettings({ trackAutomatically: v })} />
        </SettingRow>
        <SettingRow label="Pause when browser loses focus" description="Stop timer if you switch to another app">
          <Toggle checked={settings.pauseOnBlur} onChange={(v) => updateSettings({ pauseOnBlur: v })} />
        </SettingRow>
        <SettingRow label="Pause when idle" description="Pause if there is no keyboard/mouse activity">
          <Toggle checked={settings.pauseOnIdle} onChange={(v) => updateSettings({ pauseOnIdle: v })} />
        </SettingRow>

        <SettingRow label="Idle threshold" description="Minutes of inactivity before pausing">
          <input
            type="number"
            value={Math.round(settings.idleThresholdSeconds / 60)}
            min={1}
            max={60}
            onChange={(e) => updateSettings({ idleThresholdSeconds: (parseInt(e.target.value) || 1) * 60 })}
            className="w-20 bg-surface-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 text-right focus:outline-none focus:border-ticker-500/50"
          />
        </SettingRow>
      </div>

      {/* Interface */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Interface</h2>
        <SettingRow label="Enable floating timer" description="Show a draggable timer widget on tracked websites">
          <Toggle checked={settings.enableFloatingTimer} onChange={(v) => updateSettings({ enableFloatingTimer: v })} />
        </SettingRow>

        <SettingRow label="Floating timer position" description="Default position for the floating widget">
          <select
            value={settings.floatingTimerPosition}
            onChange={(e) => updateSettings({ floatingTimerPosition: e.target.value as typeof settings.floatingTimerPosition })}
            className="bg-surface-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none"
          >
            <option value="top-right">Top Right</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
          </select>
        </SettingRow>
      </div>
    </div>
  );
}
