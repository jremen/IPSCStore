import { useEffect, useRef } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useScoringStore } from '../stores/scoringStore';

/**
 * Hook that detects online/offline transitions and:
 * - Updates scoringStore.isOfflineMode
 * - Shows toast notifications when connectivity changes
 * - Triggers sync when coming back online
 */
export function useOfflineStatus() {
  const addToast = useUIStore((s) => s.addToast);
  const setOfflineMode = useScoringStore((s) => s.setOfflineMode);
  const wasOffline = useRef(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      if (wasOffline.current) {
        addToast('Back online. Syncing pending scores...', 'info');
        wasOffline.current = false;
      }
      setOfflineMode(false);

      // First: re-authenticate any offline stage sessions with the server,
      // so pending saves flush with a valid server token.
      import('../stores/authStore').then(({ useAuthStore }) => {
        return useAuthStore.getState().syncOfflineAuth();
      }).then(() => {
        // Then trigger sync of pending saves
        import('../services/syncManager').then(({ flushPendingSaves, requestSync }) => {
          flushPendingSaves().catch(() => {});
          // Also register a Background Sync in case the user goes offline again
          requestSync().catch(() => {});
        });
      });
    };

    const handleOffline = () => {
      addToast('You are offline. Scores will be saved locally.', 'error');
      wasOffline.current = true;
      setOfflineMode(true);
    };

    // Set initial state
    setOfflineMode(!navigator.onLine);

    // If we started online but have pending saves, flush them now (fresh load)
    if (navigator.onLine) {
      import('../services/syncManager').then(({ flushPendingSaves }) => {
        flushPendingSaves().catch(() => {});
      });
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast, setOfflineMode]);
}