import { useEffect } from 'react';
import { useLanUrl } from '../hooks/useLanUrl';
import { setScoringBaseUrl } from '../services/api';

/**
 * Reads the LAN URL for the scoring server and caches it so that
 * stage link QR codes contain the correct origin (phone-reachable).
 * Mount once at the top of the app (e.g. in main.tsx).
 */
export function ScoringBaseUrlProvider() {
  const { domainUrls, loading } = useLanUrl();

  useEffect(() => {
    if (!loading && domainUrls?.hodnotenie) {
      // Strip /hodnotenie path to get just the origin (e.g. "http://192.168.1.5:3001")
      const url = domainUrls.hodnotenie.replace(/\/hodnotenie\/?$/, '');
      setScoringBaseUrl(url);
    }
  }, [domainUrls, loading]);

  return null;
}
