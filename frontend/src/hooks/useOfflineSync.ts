import { useEffect, useRef } from 'react';
import { useScoringStore } from '../stores/scoringStore';

/** How often to poll for pending saves when online (in ms) */
const SYNC_POLL_INTERVAL = 30_000;

/**
 * Hook that provides Safari/fallback sync for pending offline saves.
 *
 * Safari and some browsers don't support the Background Sync API.
 * This hook:
 * - Listens for the `online` event to trigger immediate sync
 * - Polls every 30s when online and there are pending saves
 * - Listens for SW `TRIGGER_SYNC` messages (from Background Sync)
 */
export function useOfflineSync() {
  const pendingSaveCount = useScoringStore((s) => s.pendingSaveCount);
  const refreshPendingCount = useScoringStore((s) => s.refreshPendingCount);
  const intervalRef = useRef<number | null>(null);

  // Load pending count on mount
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Periodic polling when there are pending saves
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only poll when online and there are pending saves
    if (pendingSaveCount > 0 && navigator.onLine) {
      intervalRef.current = window.setInterval(() => {
        if (navigator.onLine) {
          import('../services/syncManager').then(({ flushPendingSaves }) => {
            flushPendingSaves().catch(() => {});
          });
        }
      }, SYNC_POLL_INTERVAL);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pendingSaveCount]);

  // Listen for SW messages (TRIGGER_SYNC from Background Sync)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TRIGGER_SYNC') {
        import('../services/syncManager').then(({ flushPendingSaves }) => {
          flushPendingSaves().catch(() => {});
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);
}