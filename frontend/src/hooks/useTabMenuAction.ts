import { useEffect } from 'react';
import { onMenuAction, getPendingMenuAction, clearPendingMenuAction, subscribeToPendingMenuAction } from './useMenuActions';

/**
 * Hook for tab components to respond to their native menu actions.
 * Picks up both live menu events (when already on the tab) and pending
 * actions set by the central listener during a tab switch.
 */
export function useTabMenuAction(
  action: string,
  handler: (payload?: any) => void
): void {
  // Listen for live menu events.
  useEffect(() => {
    return onMenuAction(action, (payload) => {
      handler(payload);
    });
  }, [action, handler]);

  // Check for pending action on mount and when pending action changes.
  useEffect(() => {
    const check = () => {
      const pending = getPendingMenuAction();
      if (pending?.action === action) {
        handler(pending.payload);
        clearPendingMenuAction();
      }
    };
    check();
    return subscribeToPendingMenuAction(check);
  }, [action, handler]);
}
