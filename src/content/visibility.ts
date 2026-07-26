// ============================================================
// Visibility & SPA Navigation Watcher
// ============================================================

export function watchVisibility(onChange: (visible: boolean) => void): () => void {
  const handler = () => onChange(document.visibilityState === 'visible');
  document.addEventListener('visibilitychange', handler);
  // Initial state
  onChange(document.visibilityState === 'visible');
  return () => document.removeEventListener('visibilitychange', handler);
}

export function watchSPANavigation(onChange: (url: string) => void): () => void {
  let lastUrl = location.href;

  // History API navigation
  const onPopState = () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onChange(lastUrl);
    }
  };

  // pushState / replaceState override
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    originalPushState(...args);
    setTimeout(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        onChange(lastUrl);
      }
    }, 0);
  };

  history.replaceState = function (...args) {
    originalReplaceState(...args);
    setTimeout(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        onChange(lastUrl);
      }
    }, 0);
  };

  window.addEventListener('popstate', onPopState);

  return () => {
    window.removeEventListener('popstate', onPopState);
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
  };
}
