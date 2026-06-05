import { create } from 'zustand';
import { api } from '../services/api';
import type { Stage, CreateStageInput } from '../types/stage';

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
}

export const useStageStore = create<StageState & StageActions>((set, get) => ({
  stages: [],
  currentStage: null,
  loading: false,
  error: null,

  fetchStages: async (matchId) => {
    set({ loading: true, error: null });
    try {
      const stages = await api.getStages(matchId);
      set({ stages, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createStage: async (matchId, data) => {
    const stage = await api.createStage(matchId, data);
    set((state) => ({ stages: [...state.stages, stage] }));
    return stage;
  },

  updateStage: async (id, data) => {
    const updated = await api.updateStage(id, data);
    set((state) => ({
      stages: state.stages.map((s) => (s.id === id ? updated : s)),
      currentStage: state.currentStage?.id === id ? updated : state.currentStage,
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
}));