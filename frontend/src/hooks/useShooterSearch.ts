import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface ShooterSearchResult {
  shooters: any[];
  total: number;
  loading: boolean;
  search: string;
  setSearch: (query: string) => void;
}

/**
 * Hook for searching shooters with server-side filtering.
 * When the search query is empty, loads all shooters (no limit).
 * When a query is provided, searches by name/email on the backend.
 * Already-registered shooter IDs are excluded client-side.
 */
export function useShooterSearch(excludedIds: string[]): ShooterSearchResult {
  const [shooters, setShooters] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input — 250ms delay before hitting the server
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchResults = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params: { search?: string; limit?: number } = {};
      if (query.trim()) {
        // Server-side search — no limit needed, backend returns all matches
        params.search = query.trim();
      } else {
        // No search text — load up to 500 shooters (all if fewer)
        params.limit = 500;
      }
      const result = await api.getShooters(params);
      setShooters(result.shooters);
      setTotal(result.total);
    } catch {
      // Keep previous results on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(debouncedSearch);
  }, [debouncedSearch, fetchResults]);

  // Exclude already-registered and already-added shooters
  const excludedSet = new Set(excludedIds);
  const filteredShooters = shooters.filter((s) => !excludedSet.has(s.id));

  return { shooters: filteredShooters, total, loading, search, setSearch };
}