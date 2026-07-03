import { create } from 'zustand';
import { api } from '../services/api';
import * as offlineDB from '../services/offlineDB';
import { shouldAttemptApiCall } from '../services/connectivity';
import type { Stage, CreateStageInput } from '../types/stage';

/** Parse stage.config if it came back as a JSON string from postgres driver */
function parseStageConfig(stage: any): Stage {
  if (!stage) return stage;
  const result = { ...stage };
  if (typeof result.config === 'string') {
    try { result.config = JSON.parse(result.config); } catch { result.config = {}; }
  }
  return result as Stage;
}

/** Sort stages by stage_number to ensure consistent ordering */
function byStageNumber(a: Stage, b: Stage): number {
  return (a.stage_number ?? 0) - (b.stage_number ?? 0);
}

interface StageState {
  stages: Stage[];
  currentStage: Stage | null;
  loading: boolean;
  error: string | null;
}

interface StageActions {
  fetchStages: (matchId: string) => Promise<void>;
  createStage: (matchId: string, data: CreateStageInput) => Promise<Stage>;
  updateStage: (id: string, data: Partial<CreateStageInput>) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  uploadImage: (stageId: string, file: File) => Promise<void>;
  removeImage: (stageId: string) => Promise<void>;
  resetStages: () => void;
}

export const useStageStore = create<StageState & StageActions>((set) => ({
  stages: [],
  currentStage: null,
  loading: false,
  error: null,

  fetchStages: async (matchId) => {
    set({ loading: true, error: null });

    // Cache-first: try IndexedDB immediately — no network probe, instant render
    let cachedData: Stage[] | null = null;
    try {
      const cached = await offlineDB.getCachedStages(matchId);
      if (cached.length > 0) cachedData = cached.map(parseStageConfig).sort(byStageNumber);
    } catch { /* IDB error — proceed to network path */ }

    if (cachedData) {
      set({ stages: cachedData, loading: false });
    }

    // If online and reachable, try API in background to refresh with fresh data
    if (shouldAttemptApiCall()) {
      try {
        const stages = await api.getStages(matchId);
        const parsed = stages.map(parseStageConfig).sort(byStageNumber);
        set({ stages: parsed, loading: false });
        offlineDB.cacheStages(matchId, parsed).catch(() => {});
      } catch {
        // API failed — keep cached data if available, otherwise show error
        if (!cachedData) {
          set({ stages: [], error: 'Could not load stages', loading: false });
        }
      }
    } else if (!cachedData) {
      // Offline + no cache — show empty state immediately
      set({ stages: [], error: 'No cached stages available', loading: false });
    }
  },

  createStage: async (matchId, data) => {
    const stage = await api.createStage(matchId, data);
    const parsed = parseStageConfig(stage);
    set((state) => ({ stages: [...state.stages, parsed] }));
    return parsed;
  },

  updateStage: async (id, data) => {
    const updated = await api.updateStage(id, data);
    const parsed = parseStageConfig(updated);
    set((state) => ({
      stages: state.stages.map((s) => (s.id === id ? parsed : s)),
      currentStage: state.currentStage?.id === id ? parsed : state.currentStage,
    }));
  },

  deleteStage: async (id) => {
    await api.deleteStage(id);
    set((state) => ({
      stages: state.stages.filter((s) => s.id !== id),
      currentStage: state.currentStage?.id === id ? null : state.currentStage,
    }));
  },

  uploadImage: async (stageId, file) => {
    const result = await api.uploadStageImage(stageId, file);
    set((state) => ({
      stages: state.stages.map((s) => (s.id === stageId ? { ...s, image_path: result.image_path } : s)),
    }));
  },

  removeImage: async (stageId) => {
    await api.deleteStageImage(stageId);
    set((state) => ({
      stages: state.stages.map((s) => (s.id === stageId ? { ...s, image_path: null } : s)),
    }));
  },

  resetStages: () => {
    set({ stages: [], currentStage: null });
  },
}));