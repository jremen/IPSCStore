import { useSSEStore } from '../stores/sseStore';

// Use empty string so the stream connects to the same origin — Vite dev proxy forwards
// /api/* to backend. In production / Electron, the API base may be an absolute URL.
function getApiBase(): string {
  if (typeof window !== 'undefined' && window.electronAPI?.getApiBaseUrl) {
    return window.electronAPI.getApiBaseUrl();
  }
  return import.meta.env.VITE_API_URL || '';
}

const isDebug = typeof window !== 'undefined' && localStorage.getItem('ipscscore-debug-sse') === 'true';

function debug(...args: unknown[]) {
  if (isDebug) console.log('[SSE frontend]', ...args);
}

type EventCallback<T = unknown> = (payload: T) => void;

interface SSEClient {
  subscribe: <T = unknown>(event: string, callback: EventCallback<T>) => () => void;
  close: () => void;
  isConnected: () => boolean;
}

const MAX_RETRY_DELAY_MS = 30000;

/**
 * Open a long-lived Server-Sent Events connection to `/api/events`.
 *
 * The connection is automatically reopened with exponential backoff when the
 * server closes it or the network drops. Consumers subscribe to typed events
 * and receive parsed payloads.
 */
export function connectToEventStream(matchId: string | null): SSEClient {
  const base = getApiBase();
  const url = matchId
    ? `${base}/api/events?matchId=${encodeURIComponent(matchId)}`
    : `${base}/api/events`;

  const listeners = new Map<string, Set<EventCallback>>();
  const registeredEventTypes = new Set<string>();
  let eventSource: EventSource | null = null;
  let retryDelay = 1000;
  let closed = false;
  let connected = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function setConnected(value: boolean) {
    if (connected === value) return;
    connected = value;
    useSSEStore.getState().setConnected(value);
    debug('connected:', value);
  }

  function emit(event: string, payload: unknown) {
    debug('emit', event, payload);
    const subs = listeners.get(event);
    if (!subs) return;
    for (const cb of subs) {
      try {
        cb(payload);
      } catch {
        // Subscriber errors should not break the stream
      }
    }
  }

  function registerEventType(event: string) {
    if (registeredEventTypes.has(event) || !eventSource) return;
    registeredEventTypes.add(event);
    eventSource.addEventListener(event, (e: MessageEvent) => {
      try {
        emit(event, JSON.parse(e.data));
      } catch {
        emit(event, e.data);
      }
    });
  }

  function scheduleReconnect() {
    if (closed || reconnectTimer) return;
    setConnected(false);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!closed) open();
    }, retryDelay);
    debug('reconnect in', retryDelay, 'ms');
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
  }

  function open() {
    if (closed || eventSource) return;

    debug('opening EventSource', url);
    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      debug('onopen');
      setConnected(true);
      retryDelay = 1000;
    };

    eventSource.onerror = () => {
      debug('onerror');
      eventSource?.close();
      eventSource = null;
      registeredEventTypes.clear();
      scheduleReconnect();
    };

    // Re-register any listeners the app already subscribed to
    for (const event of listeners.keys()) {
      registerEventType(event);
    }
  }

  return {
    subscribe: <T = unknown>(event: string, callback: EventCallback<T>) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      const subs = listeners.get(event)!;
      const typedCallback = callback as EventCallback;
      subs.add(typedCallback);
      registerEventType(event);
      // Open the connection on the first subscription so listeners are always
      // registered before the EventSource starts receiving events.
      if (!eventSource && !closed) {
        open();
      }
      return () => {
        subs.delete(typedCallback);
      };
    },
    close: () => {
      debug('close');
      closed = true;
      setConnected(false);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      eventSource?.close();
      eventSource = null;
      listeners.clear();
      registeredEventTypes.clear();
    },
    isConnected: () => connected,
  };
}
