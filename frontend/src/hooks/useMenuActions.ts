import { useEffect } from 'react';

const EVENT_PREFIX = 'ipscscore:menu:';

/** Map of menu actions to the tab they should be executed on. */
export const TAB_ACTIONS: Record<string, string> = {
  'new-match': 'matches',
  'winmss-import': 'matches',
  'delete-all-matches': 'matches',
  'new-stage': 'stages',
  'print-score-sheets': 'stages',
  'new-shooter': 'shooters',
  'import-shooters-csv': 'shooters',
  'toggle-show-deleted': 'shooters',
  'add-registration': 'registration',
  'new-registration-shooter': 'registration',
  'import-registrations-csv': 'registration',
  'prev-shooter': 'scoring',
  'next-shooter': 'scoring',
  'confirm-score': 'scoring',
  'print-results': 'results',
  'export-results-pdf': 'results',
  'export-results-csv': 'results',
  'export-results-html': 'results',
};

interface PendingAction {
  action: string;
  payload?: any;
}

let pendingAction: PendingAction | null = null;
let pendingListeners: Set<() => void> = new Set();

/**
 * Store a pending menu action. Used when switching tabs — the target tab
 * component will pick up the action when it mounts.
 */
export function setPendingMenuAction(action: string, payload?: any) {
  pendingAction = { action, payload };
  pendingListeners.forEach((fn) => fn());
}

export function getPendingMenuAction(): PendingAction | null {
  return pendingAction;
}

export function clearPendingMenuAction() {
  pendingAction = null;
  pendingListeners.forEach((fn) => fn());
}

export function subscribeToPendingMenuAction(listener: () => void): () => void {
  pendingListeners.add(listener);
  return () => pendingListeners.delete(listener);
}

/**
 * Dispatch a custom DOM event that components can listen for.
 */
export function dispatchMenuEvent(action: string, payload?: any) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}${action}`, { detail: payload }));
}

/**
 * Subscribe to a specific native menu action.
 * Returns an unsubscribe function.
 */
export function onMenuAction(action: string, handler: (payload?: any) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const eventName = `${EVENT_PREFIX}${action}`;
  const listener = (e: Event) => handler((e as CustomEvent).detail);
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}

/**
 * Hook that bridges Electron native menu actions to the React app.
 * If a handler is provided, it receives every action. Otherwise actions are
 * dispatched as custom DOM events.
 */
export function useMenuActions(handler?: (action: string, payload?: any) => void) {
  useEffect(() => {
    if (!window.electronAPI?.onMenuAction) return;

    return window.electronAPI.onMenuAction((action, payload) => {
      if (handler) {
        handler(action, payload);
      } else {
        dispatchMenuEvent(action, payload);
      }
    });
  }, [handler]);
}
