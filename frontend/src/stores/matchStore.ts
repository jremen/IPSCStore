import { create } from 'zustand';
import { api } from '../services/api';
import * as offlineDB from '../services/offlineDB';
import { shouldAttemptApiCall } from '../services/connectivity';
import type { Match, MatchDetail, CreateMatchInput } from '../types/match';

interface MatchState {
  matches: Match[];
  currentMatch: MatchDetail | null;
  runningMatch: Match | null;
  loading: boolean;
  error: string | null;
}

interface MatchActions {
  fetchMatches: () => Promise<void>;
  fetchMatch: (id: string) => Promise<void>;
  createMatch: (data: CreateMatchInput) => Promise<Match>;
  updateMatch: (id: string, data: Partial<CreateMatchInput>) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  bulkDeleteMatches: (ids: string[]) => Promise<{ deleted: number; failed: Array<{ id: string; name: string; reason: string }> }>;
  setCurrentMatch: (id: string | null) => Promise<void>;
  markCurrent: (id: string) => Promise<void>;
  unmarkCurrent: () => Promise<void>;
}

export const useMatchStore = create<MatchState & MatchActions>((set, get) => ({
  matches: [],
  currentMatch: null,
  runningMatch: null,
  loading: false,
  error: null,

  fetchMatches: async () => {
    set({ loading: true, error: null });

    // Cache-first: try IndexedDB immediately — no network probe, instant render
    let cachedData: Match[] | null = null;
    try {
      const cached = await offlineDB.getCachedMatches();
      if (cached.length > 0) cachedData = cached;
    } catch { /* IDB error — proceed to network path */ }

    if (cachedData) {
      const runningMatch = cachedData.find((m: any) => m.is_current) ?? null;
      set({ matches: cachedData, runningMatch, loading: false });
    }

    // If online and reachable, try API in background to refresh with fresh data
    if (shouldAttemptApiCall()) {
      try {
        const matches = await api.getMatches();
        const runningMatch = matches.find(m => m.is_current);
        set({ matches, runningMatch, loading: false });
        offlineDB.cacheMatches(matches).catch(() => {});
      } catch {
        // API failed — keep cached data if available, otherwise show error
        if (!cachedData) {
          set({ matches: [], error: 'Could not load matches', loading: false });
        }
      }
    } else if (!cachedData) {
      // Offline + no cache — show empty state immediately
      set({ matches: [], error: 'No cached matches available', loading: false });
    }
  },

  fetchMatch: async (id) => {
    set({ loading: true, error: null });
    try {
      const match = await api.getMatch(id);
      set({ currentMatch: match, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createMatch: async (data) => {
    const match = await api.createMatch(data);
    set((state) => ({ matches: [match, ...state.matches] }));
    return match;
  },

  updateMatch: async (id, data) => {
    const updated = await api.updateMatch(id, data);
    set((state) => ({
      matches: state.matches.map((m) => (m.id === id ? updated : m)),
      currentMatch: state.currentMatch?.id === id ? { ...state.currentMatch, ...updated } : state.currentMatch,
    }));
  },

  deleteMatch: async (id) => {
    await api.deleteMatch(id);
    set((state) => ({
      matches: state.matches.filter((m) => m.id !== id),
      currentMatch: state.currentMatch?.id === id ? null : state.currentMatch,
    }));
  },

  bulkDeleteMatches: async (ids) => {
    const result = await api.bulkDeleteMatches(ids);
    set((state) => ({
      matches: state.matches.filter((m) => !ids.includes(m.id)),
      currentMatch: state.currentMatch && ids.includes(state.currentMatch.id) ? null : state.currentMatch,
    }));
    return result;
  },

  setCurrentMatch: async (id) => {
    if (id) {
      await get().fetchMatch(id);
    } else {
      set({ currentMatch: null });
    }
  },

  markCurrent: async (id) => {
    const updated = await api.setCurrentMatch(id);
    set((state) => {
      const matches = state.matches.map((m) => ({
        ...m,
        is_current: m.id === id,
      }));
      const runningMatch = matches.find(m => m.is_current) ?? null;
      // Update IndexedDB cache so offline mode reflects the change
      offlineDB.cacheMatches(matches).catch(() => {});
      return { matches, runningMatch };
    });
  },

  unmarkCurrent: async () => {
    await api.unsetCurrentMatch();
    set((state) => {
      const matches = state.matches.map((m) => ({
        ...m,
        is_current: false,
      }));
      offlineDB.cacheMatches(matches).catch(() => {});
      return { matches, runningMatch: null };
    });
  },
}));
