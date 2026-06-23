/**
 * Backend reachability probe.
 *
 * Detects whether the backend is actually reachable (not just that the OS
 * network interface is up). Returns a cached result so multiple callers
 * don't flood the network.
 */
const PROBE_INTERVAL_MS = 30_000;
const PROBE_TIMEOUT_MS = 4_000;

let lastProbeResult: boolean | null = null;
let lastProbeTime = 0;
let probeInFlight: Promise<boolean> | null = null;
const listeners = new Set<(reachable: boolean) => void>();

function getApiBaseFromModule(): string {
  if (typeof window !== 'undefined' && window.electronAPI?.getApiBaseUrl) {
    return window.electronAPI.getApiBaseUrl();
  }
  return (import.meta as any).env?.VITE_API_URL || '';
}

/**
 * Probe the backend once. Returns true if the /api/health endpoint
 * responds within the timeout.
 */
async function probeOnce(): Promise<boolean> {
  const base = getApiBaseFromModule();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(`${base}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      // Don't send credentials or auth — this is just a liveness check
      headers: { 'Cache-Control': 'no-cache' },
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Check if the backend is reachable. Uses a cached result (up to
 * PROBE_INTERVAL_MS old) to avoid hammering the network.
 */
export async function isBackendReachable(): Promise<boolean> {
  const now = Date.now();
  if (lastProbeResult !== null && now - lastProbeTime < PROBE_INTERVAL_MS) {
    return lastProbeResult;
  }
  if (probeInFlight) return probeInFlight;

  probeInFlight = probeOnce();
  const result = await probeInFlight;
  probeInFlight = null;

  lastProbeResult = result;
  lastProbeTime = Date.now();
  listeners.forEach((cb) => cb(result));
  return result;
}

/**
 * Force a re-probe (e.g., when the OS fires the 'online' event).
 */
export async function reprobe(): Promise<boolean> {
  lastProbeResult = null;
  lastProbeTime = 0;
  return isBackendReachable();
}

/**
 * Subscribe to reachability changes. The callback fires when a probe
 * completes with a different result than the previous one.
 */
export function onReachabilityChange(cb: (reachable: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Synchronous check: returns the last known result, or navigator.onLine
 * if no probe has run yet. Useful as a fast guard in stores.
 */
export function isOnlineSync(): boolean {
  return lastProbeResult ?? navigator.onLine;
}

// ── Network error detection ────────────────────────────────────────────────

/**
 * Timeout for API fetch calls. If a request takes longer than this,
 * it is treated as a network failure (host down, hung server, firewall
 * blackhole) and the caller should queue the mutation offline.
 */
export const FETCH_TIMEOUT_MS = 30_000;

/**
 * Determine whether a thrown error represents a network-level failure
 * (offline, timeout, DNS failure, etc.). Different browsers produce
 * different messages, so we also accept TypeError, AbortError, and
 * the current navigator.onLine state.
 */
export function isNetworkError(err: any): boolean {
  if (!navigator.onLine) return true;
  if (err instanceof TypeError) return true;
  if (err?.name === 'AbortError') return true;
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('internet connection appears to be offline') ||
    msg.includes('offline')
  );
}
