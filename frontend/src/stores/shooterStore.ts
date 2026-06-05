import { create } from 'zustand';
import { api } from '../services/api';
import type { Shooter, CreateShooterInput } from '../types/shooter';

interface ShooterState {
  shooters: Shooter[];
  allTags: string[];
  total: number;
  searchQuery: string;
  loading: boolean;
  error: string | null;
}

interface ShooterActions {
  fetchShooters: (params?: { search?: string; limit?: number; offset?: number }) => Promise<void>;
  createShooter: (data: CreateShooterInput) => Promise<Shooter>;
  updateShooter: (id: string, data: Partial<CreateShooterInput>) => Promise<void>;
  deleteShooter: (id: string) => Promise<void>;
  fetchTags: () => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useShooterStore = create<ShooterState & ShooterActions>((set) => ({
  shooters: [],
  allTags: [],
  total: 0,
  searchQuery: '',
  loading: false,
  error: null,

  fetchShooters: async (params) => {
    set({ loading: true, error: null });
    try {
      const result = await api.getShooters(params);
      set({ shooters: result.shooters, total: result.total, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createShooter: async (data) => {
    const shooter = await api.createShooter(data);
    set((state) => ({ shooters: [...state.shooters, shooter], total: state.total + 1 }));
    return shooter;
  },

  updateShooter: async (id, data) => {
    const updated = await api.updateShooter(id, data);
    set((state) => ({
      shooters: state.shooters.map((s) => (s.id === id ? updated : s)),
    }));
  },

  deleteShooter: async (id) => {
    await api.deleteShooter(id);
    set((state) => ({
      shooters: state.shooters.filter((s) => s.id !== id),
      total: state.total - 1,
    }));
  },

  fetchTags: async () => {
    const tags = await api.getTags();
    set({ allTags: tags });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
}));