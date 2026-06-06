import { create } from 'zustand';
import { api } from '../services/api';
import type { Match, MatchDetail, CreateMatchInput } from '../types/match';

interface MatchState {
  matches: Match[];
  currentMatch: MatchDetail | null;
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
  loading: false,
  error: null,

  fetchMatches: async () => {
    set({ loading: true, error: null });
    try {
      const matches = await api.getMatches();
      set({ matches, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
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
    set((state) => ({
      matches: state.matches.map((m) => ({
        ...m,
        is_current: m.id === id ? true : false,
      })),
    }));
  },

  unmarkCurrent: async () => {
    await api.unsetCurrentMatch();
    set((state) => ({
      matches: state.matches.map((m) => ({
        ...m,
        is_current: false,
      })),
    }));
  },
}));