import { useState, useEffect } from 'react';

export interface LanUrlInfo {
  /** IP-based LAN URL (e.g. http://192.168.1.5:3001) */
  url: string | null;
  /** .local domain URLs for results and scoring */
  domainUrls: { vysledky: string; hodnotenie: string } | null;
  loading: boolean;
}

/**
 * Build a URL for a .local domain, using port 80 (no port suffix) when
 * the port-80 redirect is active, or port 3001 otherwise.
 */
function buildDomainUrl(hostname: string, port: number | string | undefined, port80Active: boolean): string {
  // In Electron mode with port 80 active, use port-less URLs
  if (port80Active) {
    return `http://${hostname}`;
  }
  // In web mode, use the current page's port (empty for port 80, explicit for others)
  if (!port || port === '80' || port === 80) {
    return `http://${hostname}`;
  }
  return `http://${hostname}:${port}`;
}

/**
 * Hook to detect the LAN URL where range masters can connect.
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
    // Electron mode
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
      // Get domain URLs from Electron
      if (window.electronAPI.getDomainUrls) {
        setDomainUrls(window.electronAPI.getDomainUrls());
      }
      setLoading(false);
      return;
    }

    // Web mode: detect port from current page
    const currentPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
    const port80Active = currentPort === '80' || currentPort === '' || window.location.port === '';

    // Web mode: already accessing via .local domain
    const hostname = window.location.hostname;
    if (hostname === 'vysledky.local' || hostname.endsWith('.vysledky.local')) {
      setDomainUrls({
        vysledky: buildDomainUrl('vysledky.local', currentPort, port80Active),
        hodnotenie: buildDomainUrl('hodnotenie.local', currentPort, port80Active),
      });
    } else if (hostname === 'hodnotenie.local' || hostname.endsWith('.hodnotenie.local')) {
      setDomainUrls({
        vysledky: buildDomainUrl('vysledky.local', currentPort, port80Active),
        hodnotenie: buildDomainUrl('hodnotenie.local', currentPort, port80Active),
      });
    }

    // Web mode: already accessing via LAN IP
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('0.')) {
      setUrl(`${window.location.protocol}//${window.location.host}`);
      // Also provide .local domain URLs alongside the IP
      if (!domainUrls) {
        setDomainUrls({
          vysledky: buildDomainUrl('vysledky.local', currentPort, port80Active),
          hodnotenie: buildDomainUrl('hodnotenie.local', currentPort, port80Active),
        });
      }
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
          // In web mode on localhost, we don't know if port 80 is active,
          // so default to showing port 3001 (the direct backend port)
          setDomainUrls({
            vysledky: `http://vysledky.local:${data.port || 3001}`,
            hodnotenie: `http://hodnotenie.local:${data.port || 3001}`,
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