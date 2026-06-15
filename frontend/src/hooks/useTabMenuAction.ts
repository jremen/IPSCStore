import { useEffect, useRef } from 'react';
import { onMenuAction, getPendingMenuAction, clearPendingMenuAction, subscribeToPendingMenuAction } from './useMenuActions';

/**
 * Hook for tab components to respond to their native menu actions.
 * Picks up both live menu events (when already on the tab) and pending
 * actions set by the central listener during a tab switch.
 *
 * The handler is executed after a short delay when consuming a pending
 * action, giving the component time to fully mount/render before opening
 * modals or focusing inputs.
 */
export function useTabMenuAction(
  action: string,
  handler: (payload?: any) => void
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  // Listen for live menu events.
  useEffect(() => {
    return onMenuAction(action, (payload) => {
      handlerRef.current(payload);
    });
  }, [action]);

  // Check for pending action on mount and when pending action changes.
  useEffect(() => {
    const check = () => {
      const pending = getPendingMenuAction();
      if (pending?.action === action) {
        // Defer execution so the tab component has fully mounted and rendered.
        const id = window.setTimeout(() => {
          handlerRef.current(pending.payload);
          clearPendingMenuAction();
        }, 50);
        return () => window.clearTimeout(id);
      }
    };
    const cleanup = check();
    const unsubscribe = subscribeToPendingMenuAction(check);
    return () => {
      unsubscribe();
      if (cleanup) cleanup();
    };
  }, [action]);
}
