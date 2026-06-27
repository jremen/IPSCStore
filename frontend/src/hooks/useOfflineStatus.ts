import { useEffect, useRef } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useScoringStore } from '../stores/scoringStore';
import { isBackendReachable, reprobe, shouldAttemptApiCall } from '../services/connectivity';

/**
 * Hook that detects online/offline transitions and:
 * - Updates scoringStore.isOfflineMode (using backend reachability, not just navigator.onLine)
 * - Shows toast notifications when connectivity changes
 * - Triggers sync when coming back online
 */
export function useOfflineStatus() {
  const addToast = useUIStore((s) => s.addToast);
  const setOfflineMode = useScoringStore((s) => s.setOfflineMode);
  const wasOffline = useRef(!navigator.onLine);

  useEffect(() => {
    const handleOnline = async () => {
      // OS says we're back online — verify the backend is actually reachable
      const reachable = await reprobe();
      if (reachable) {
        if (wasOffline.current) {
          addToast('Back online. Syncing pending scores...', 'info');
          wasOffline.current = false;
        }
        setOfflineMode(false);

        // Re-validate scorer trust session with the server,
        // so pending saves flush with a valid server token.
        import('../stores/authStore').then(({ useAuthStore }) => {
          return useAuthStore.getState().revalidateTrust();
        }).then(() => {
          // Then trigger sync of pending saves
          import('../services/syncManager').then(({ flushPendingSaves, requestSync }) => {
            flushPendingSaves().catch(() => {});
            requestSync().catch(() => {});
          });
        });
      } else {
        // OS says online but backend unreachable — still offline
        if (!wasOffline.current) {
          addToast('Network is up but server is unreachable.', 'error');
          wasOffline.current = true;
        }
        setOfflineMode(true);
      }
    };

    const handleOffline = () => {
      addToast('You are offline. Scores will be saved locally.', 'error');
      wasOffline.current = true;
      setOfflineMode(true);
    };

    // Set initial state: if we already know the backend is unreachable, skip
    // the probe and go offline immediately (avoids 4s hang on cold-start).
    if (shouldAttemptApiCall()) {
      (async () => {
        const reachable = await isBackendReachable();
        setOfflineMode(!reachable);
        wasOffline.current = !reachable;
      })();
    } else {
      setOfflineMode(true);
      wasOffline.current = true;
    }

    // If we started online but have pending saves, flush them now (fresh load)
    if (shouldAttemptApiCall()) {
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
