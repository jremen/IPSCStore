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
  showDeleted: boolean;
}

interface ShooterActions {
  fetchShooters: (params?: { search?: string; limit?: number; offset?: number; include_deleted?: boolean; deleted_only?: boolean }) => Promise<void>;
  createShooter: (data: CreateShooterInput) => Promise<Shooter>;
  updateShooter: (id: string, data: Partial<CreateShooterInput>) => Promise<void>;
  deleteShooter: (id: string) => Promise<void>;
  restoreShooter: (id: string) => Promise<void>;
  bulkUpdateShooters: (shooterIds: string[], updates: { division?: string; category?: string; power_factor?: string }) => Promise<void>;
  bulkDeleteShooters: (shooterIds: string[]) => Promise<void>;
  fetchTags: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleShowDeleted: () => void;
}

export const useShooterStore = create<ShooterState & ShooterActions>((set, get) => ({
  shooters: [],
  allTags: [],
  total: 0,
  searchQuery: '',
  loading: false,
  error: null,
  showDeleted: false,

  fetchShooters: async (params) => {
    set({ loading: true, error: null });
    try {
      const { searchQuery, showDeleted } = get();
      const result = await api.getShooters({
        search: params?.search ?? (searchQuery || undefined),
        limit: params?.limit,
        offset: params?.offset,
        include_deleted: showDeleted ? true : params?.include_deleted,
        deleted_only: params?.deleted_only,
      });
      set({ shooters: result.shooters, total: result.total, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createShooter: async (data) => {
    const shooter = await api.createShooter(data);
    // Refresh from server to ensure list is consistent (e.g., server-generated fields)
    const { searchQuery } = get();
    const result = await api.getShooters(searchQuery ? { search: searchQuery } : undefined);
    set({ shooters: result.shooters, total: result.total });
    return shooter;
  },

  updateShooter: async (id, data) => {
    await api.updateShooter(id, data);
    // Refresh from server to ensure list is consistent
    const { searchQuery } = get();
    const result = await api.getShooters(searchQuery ? { search: searchQuery } : undefined);
    set({ shooters: result.shooters, total: result.total });
  },

  deleteShooter: async (id) => {
    await api.deleteShooter(id);
    // Refresh from server to ensure list and total are consistent
    const { searchQuery, showDeleted } = get();
    const result = await api.getShooters({
      search: searchQuery || undefined,
      include_deleted: showDeleted ? true : undefined,
    });
    set({ shooters: result.shooters, total: result.total });
  },

  restoreShooter: async (id) => {
    await api.restoreShooter(id);
    // Refresh from server
    const { searchQuery, showDeleted } = get();
    const result = await api.getShooters({
      search: searchQuery || undefined,
      include_deleted: showDeleted ? true : undefined,
    });
    set({ shooters: result.shooters, total: result.total });
  },

  bulkUpdateShooters: async (shooterIds, updates) => {
    await api.bulkUpdateShooters(shooterIds, updates);
    // Refresh from server to get properly typed data
    const { searchQuery } = get();
    const result = await api.getShooters(searchQuery ? { search: searchQuery } : undefined);
    set({ shooters: result.shooters, total: result.total });
  },

  bulkDeleteShooters: async (shooterIds) => {
    await api.bulkDeleteShooters(shooterIds);
    // Refresh from server to ensure list and total are consistent
    const { searchQuery, showDeleted } = get();
    const result = await api.getShooters({
      search: searchQuery || undefined,
      include_deleted: showDeleted ? true : undefined,
    });
    set({ shooters: result.shooters, total: result.total });
  },

  fetchTags: async () => {
    const tags = await api.getTags();
    set({ allTags: tags });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleShowDeleted: () => {
    const { showDeleted, searchQuery } = get();
    const newShowDeleted = !showDeleted;
    set({ showDeleted: newShowDeleted });
    // Refetch with the new filter
    get().fetchShooters({
      search: searchQuery || undefined,
      include_deleted: newShowDeleted ? true : undefined,
    });
  },
}));