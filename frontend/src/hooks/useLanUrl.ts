import { useState, useEffect } from 'react';

export interface LanUrlInfo {
  /** IP-based LAN URL for the admin interface (e.g. http://192.168.1.5:3001) */
  url: string | null;
  /** Direct IP+path URLs for results and scoring (e.g. http://192.168.1.5:3001/vysledky) */
  domainUrls: { vysledky: string; hodnotenie: string } | null;
  loading: boolean;
}

/**
 * Build a direct IP+path URL for mobile access.
 * Uses port 80 (no port suffix) when the port-80 redirect is active.
 */
function buildPathUrl(hostname: string, port: number | string | undefined, port80Active: boolean, path: string): string {
  const portSuffix = port80Active || port === '80' || port === 80 || !port ? '' : `:${port}`;
  return `http://${hostname}${portSuffix}${path}`;
}

/**
 * Hook to detect the LAN URLs where mobile devices and range masters can connect.
 * - In Electron: uses window.electronAPI.getLanIp() + getApiBaseUrl() + getDomainUrls()
 * - In web (not localhost): uses window.location directly
 * - In web (localhost): fetches /api/lan-info to get the server's LAN IP
 * Returns null when the URL would be localhost (user is already there).
 */
export function useLanUrl(): LanUrlInfo {
  const [url, setUrl] = useState<string | null>(null);
  const [domainUrls, setDomainUrls] = useState<{ vysledky: string; hodnotenie: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Electron mode — the main process provides the exact URLs to expose.
    if (window.electronAPI?.isElectron?.()) {
      const lanIp = window.electronAPI.getLanIp();
      const port80Active = window.electronAPI.isPort80Active?.() ?? false;
      if (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
        const apiBase = window.electronAPI.getApiBaseUrl();
        try {
          const port = new URL(apiBase).port || '3001';
          setUrl(port80Active ? `http://${lanIp}` : `http://${lanIp}:${port}`);
        } catch {
          setUrl(`http://${lanIp}:3001`);
        }
      }
      if (window.electronAPI.getDomainUrls) {
        setDomainUrls(window.electronAPI.getDomainUrls());
      }
      setLoading(false);
      return;
    }

    // Web mode: detect port from current page
    const currentPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
    const port80Active = currentPort === '80' || currentPort === '' || window.location.port === '';
    const hostname = window.location.hostname;

    // Web mode: accessing via .local domain or LAN IP
    if (hostname === 'vysledky.local' || hostname.endsWith('.vysledky.local') ||
        hostname === 'hodnotenie.local' || hostname.endsWith('.hodnotenie.local') ||
        (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('0.'))) {
      setUrl(`${window.location.protocol}//${window.location.host}`);
      setDomainUrls({
        vysledky: buildPathUrl(hostname, currentPort, port80Active, '/vysledky'),
        hodnotenie: buildPathUrl(hostname, currentPort, port80Active, '/hodnotenie'),
      });
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
          setDomainUrls({
            vysledky: buildPathUrl(data.ip, data.port || 3001, false, '/vysledky'),
            hodnotenie: buildPathUrl(data.ip, data.port || 3001, false, '/hodnotenie'),
          });
        }
      })
      .catch(() => {
        // Silently fail — LAN URL is nice-to-have
      })
      .finally(() => setLoading(false));
  }, []);

  return { url, domainUrls, loading };
}
