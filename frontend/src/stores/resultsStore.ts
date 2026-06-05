import { create } from 'zustand';
import { api } from '../services/api';

interface DqShooter {
  registration_id: string;
  first_name: string;
  last_name: string;
  division: string;
  category?: string;
  power_factor?: string;
  tag?: string | null;
  is_dq: boolean;
  dq_reason?: string | null;
  match_points: number;
  match_percent: number;
}

interface DqStageShooter {
  registration_id: string;
  first_name: string;
  last_name: string;
  division: string;
  hit_factor: number;
  net_points: number;
  time?: number;
  dq_reason?: string | null;
}

interface OverallResult {
  registration_id: string;
  first_name: string;
  last_name: string;
  division: string;
  category: string;
  power_factor: string;
  tag: string | null;
  is_dq: boolean;
  match_points: number;
  match_percent: number;
  position: number;
}

interface StageResult {
  registration_id: string;
  first_name: string;
  last_name: string;
  division: string;
  hit_factor: number;
  net_points: number;
  stage_percent: number;
  stage_points: number;
  position: number;
  division_position?: number;
}

interface StageResultGroup {
  stage_id: string;
  stage_number: number;
  stage_name: string;
  scores: StageResult[];
  dq_scores: DqStageShooter[];
  divisions: Record<string, StageResult[]>;
}

interface ResultsState {
  overallResults: OverallResult[];
  dqOverall: DqShooter[];
  divisionResults: Record<string, OverallResult[]>;
  dqDivisions: DqShooter[];
  stageResults: StageResultGroup[];
  categoryResults: Record<string, OverallResult[]>;
  dqCategories: DqShooter[];
  tagResults: Record<string, OverallResult[]>;
  dqTags: DqShooter[];
  loading: boolean;
  error: string | null;
}

interface ResultsActions {
  fetchOverall: (matchId: string) => Promise<void>;
  fetchByDivision: (matchId: string) => Promise<void>;
  fetchByStage: (matchId: string) => Promise<void>;
  fetchByCategory: (matchId: string) => Promise<void>;
  fetchByTag: (matchId: string) => Promise<void>;
}

export const useResultsStore = create<ResultsState & ResultsActions>((set) => ({
  overallResults: [],
  dqOverall: [],
  divisionResults: {},
  dqDivisions: [],
  stageResults: [],
  categoryResults: {},
  dqCategories: [],
  tagResults: {},
  dqTags: [],
  loading: false,
  error: null,

  fetchOverall: async (matchId) => {
    set({ loading: true, error: null });
    try {
      const data: any = await api.getOverallResults(matchId);
      // API returns { results: [...], dq: [...] }
      const results = data.results || data;
      const dq = data.dq || [];
      set({ overallResults: results, dqOverall: dq, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchByDivision: async (matchId) => {
    set({ loading: true, error: null });
    try {
      const data = await api.getDivisionResults(matchId);
      // API returns { [division]: [...results], dq: [...] }
      const dq = data.dq || [];
      const { dq: _dq, ...divisionData } = data;
      set({ divisionResults: divisionData, dqDivisions: dq, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchByStage: async (matchId) => {
    set({ loading: true, error: null });
    try {
      const data = await api.getStageResults(matchId);
      set({ stageResults: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchByCategory: async (matchId) => {
    set({ loading: true, error: null });
    try {
      const data = await api.getCategoryResults(matchId);
      const dq = data.dq || [];
      const { dq: _dq, ...categoryData } = data;
      set({ categoryResults: categoryData, dqCategories: dq, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchByTag: async (matchId) => {
    set({ loading: true, error: null });
    try {
      const data = await api.getTagResults(matchId);
      const dq = data.dq || [];
      const { dq: _dq, ...tagData } = data;
      set({ tagResults: tagData, dqTags: dq, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));

export type { OverallResult, DqShooter, DqStageShooter, StageResultGroup };