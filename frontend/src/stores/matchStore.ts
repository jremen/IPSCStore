import { create } from 'zustand';
import { api } from '../services/api';
import * as offlineDB from '../services/offlineDB';
import { isBackendReachable } from '../services/connectivity';
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

    // When offline or backend unreachable, try cached matches first
    if (!navigator.onLine || !(await isBackendReachable())) {
      try {
        const cached = await offlineDB.getCachedMatches();
        if (cached.length > 0) {
          const runningMatch = cached.find((m: any) => m.is_current) ?? null;
          set({ matches: cached, runningMatch, loading: false });
        } else {
          set({ matches: [], error: 'No cached matches available', loading: false });
        }
      } catch {
        set({ matches: [], error: 'Failed to load cached matches', loading: false });
      }
      return;
    }

    try {
      const matches = await api.getMatches();
      const runningMatch = matches.find(m => m.is_current);
      set({ matches, runningMatch, loading: false });
      // Pre-cache to IndexedDB when online
      offlineDB.cacheMatches(matches).catch(() => {});
    } catch (err: any) {
      // Network failed — try cached matches
      try {
        const cached = await offlineDB.getCachedMatches();
        if (cached.length > 0) {
          const runningMatch = cached.find((m: any) => m.is_current) ?? null;
          set({ matches: cached, runningMatch, loading: false });
        } else {
          set({ matches: [], error: err.message, loading: false });
        }
      } catch {
        set({ matches: [], error: err.message, loading: false });
      }
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
