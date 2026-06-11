/**
 * Service Worker registration utility.
 *
 * Skips registration in:
 * - Development mode (Vite HMR conflicts with SW caching)
 * - Electron context (always has local server, no need for offline)
 * - Browsers that don't support Service Workers
 */
export function registerServiceWorker() {
  // Skip in dev mode — Vite's HMR doesn't work through a service worker
  if (import.meta.env.DEV) return;

  // Skip in Electron — it always has a local server
  if (typeof window !== 'undefined' && window.electronAPI?.isElectron?.()) return;

  // Skip if Service Workers are not supported
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      console.log('[SW] Registered:', registration.scope);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('[SW] New service worker activated');
            }
          });
        }
      });
    })
    .catch((error) => {
      console.error('[SW] Registration failed:', error);
    });

  // Listen for messages from the service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'TRIGGER_SYNC') {
      // Import and call sync manager lazily to avoid circular deps
      import('../services/syncManager').then(({ flushPendingSaves }) => {
        flushPendingSaves();
      });
    }
  });
}

/**
 * Unregister the service worker (useful for debugging or cleanup).
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.unregister();
  }
}