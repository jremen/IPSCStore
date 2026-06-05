import { useState, useEffect } from 'react';

/**
 * Hook to detect the LAN URL where range masters can connect.
 * - In Electron: uses window.electronAPI.getLanIp() + getApiBaseUrl()
 * - In web (not localhost): uses window.location directly
 * - In web (localhost): fetches /api/lan-info to get the server's LAN IP
 * Returns null when the URL would be localhost (user is already there).
 */
export function useLanUrl(): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Electron mode
    if (window.electronAPI?.isElectron?.()) {
      const lanIp = window.electronAPI.getLanIp();
      if (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
        const apiBase = window.electronAPI.getApiBaseUrl();
        try {
          const port = new URL(apiBase).port || '3001';
          setUrl(`http://${lanIp}:${port}`);
        } catch {
          setUrl(`http://${lanIp}:3001`);
        }
      }
      setLoading(false);
      return;
    }

    // Web mode: already accessing via LAN IP
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('0.')) {
      setUrl(`${window.location.protocol}//${window.location.host}`);
      setLoading(false);
      return;
    }

    // Web mode on localhost: fetch LAN info from backend
    const apiBase = window.electronAPI?.getApiBaseUrl?.() || '';
    fetch(`${apiBase}/api/lan-info`)
      .then(r => r.json())
      .then((data: { ip: string; port: number }) => {
        if (data.ip && data.ip !== '127.0.0.1' && data.ip !== 'localhost') {
          setUrl(`http://${data.ip}:${data.port || 3001}`);
        }
      })
      .catch(() => {
        // Silently fail — LAN URL is nice-to-have
      })
      .finally(() => setLoading(false));
  }, []);

  return { url, loading };
}