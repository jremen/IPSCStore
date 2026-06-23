import { create } from 'zustand';
import { api } from '../services/api';
import type { ShooterStageSummariesResponse } from '../types/results';

/** Convert postgres numeric strings → JS numbers. The postgres npm driver
 *  serializes all `numeric` columns as strings. This normalizer ensures
 *  runtime data matches the TypeScript `number` types. */
function num(v: any): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function normalizeNumericFields<T extends Record<string, any>>(row: T): T {
  const out: any = { ...row };
  for (const key of Object.keys(out)) {
    if (
      key === 'hit_factor' || key === 'net_points' || key === 'stage_points' ||
      key === 'stage_percent' || key === 'match_points' || key === 'match_percent' ||
      key === 'time' || key === 'raw_points' || key === 'penalty_points' ||
      key === 'position' || key === 'division_position' ||
      key === 'alpha' || key === 'charlie' || key === 'delta' ||
      key === 'miss' || key === 'no_shoot' || key === 'total_time' ||
      key === 'procedurals' || key === 'procedural_count'
    ) {
      out[key] = num(out[key]);
    }
  }
  return out;
}

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
  procedurals?: number;
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
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot: number;
  procedurals: number;
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
  time: number | null;
  position: number;
  division_position?: number;
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot: number;
  procedurals: number;
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
  categoryResults: Record<string, Record<string, OverallResult[]>>;
  dqCategories: DqShooter[];
  tagResults: Record<string, Record<string, OverallResult[]>>;
  dqTags: DqShooter[];
  shooterSummary: ShooterStageSummariesResponse | null;
  shooterSummaryLoading: boolean;
  loading: boolean;
  error: string | null;
}

interface ResultsActions {
  fetchOverall: (matchId: string) => Promise<void>;
  fetchByDivision: (matchId: string) => Promise<void>;
  fetchByStage: (matchId: string) => Promise<void>;
  fetchByCategory: (matchId: string) => Promise<void>;
  fetchByTag: (matchId: string) => Promise<void>;
  fetchShooterStageSummaries: (matchId: string, registrationId: string) => Promise<void>;
  clearShooterSummary: () => void;
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
  shooterSummary: null,
  shooterSummaryLoading: false,
  loading: false,
  error: null,

  fetchOverall: async (matchId) => {
    set({ loading: true, error: null });
    try {
      const data: any = await api.getOverallResults(matchId);
      const results = (data.results || data).map(normalizeNumericFields);
      const dq = (data.dq || []).map(normalizeNumericFields);
      set({ overallResults: results, dqOverall: dq, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchByDivision: async (matchId) => {
    set({ loading: true, error: null });
    try {
      const data = await api.getDivisionResults(matchId);
      const dq = (data.dq || []).map(normalizeNumericFields);
      const { dq: _dq, ...divisionData } = data;
      const normalizedDivisions: Record<string, any[]> = {};
      for (const [div, rows] of Object.entries(divisionData)) {
        normalizedDivisions[div] = (rows as any[]).map(normalizeNumericFields);
      }
      set({ divisionResults: normalizedDivisions, dqDivisions: dq, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchByStage: async (matchId) => {
    set({ loading: true, error: null });
    try {
      const data = await api.getStageResults(matchId);
      const normalized = data.map((stage: any) => ({
        ...stage,
        scores: stage.scores.map(normalizeNumericFields),
        dq_scores: stage.dq_scores.map(normalizeNumericFields),
        divisions: Object.fromEntries(
          Object.entries(stage.divisions).map(([div, rows]: [string, any]) => [
            div,
            rows.map(normalizeNumericFields),
          ])
        ),
      }));
      set({ stageResults: normalized, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchByCategory: async (matchId) => {
    set({ loading: true, error: null });
    try {
      const data = await api.getCategoryResults(matchId);
      const dq = (data.dq || []).map(normalizeNumericFields);
      const { dq: _dq, ...categoryData } = data;
      const normalized: Record<string, Record<string, any[]>> = {};
      for (const [cat, divisions] of Object.entries(categoryData)) {
        normalized[cat] = {};
        for (const [div, rows] of Object.entries(divisions as Record<string, any[]>)) {
          normalized[cat][div] = rows.map(normalizeNumericFields);
        }
      }
      set({ categoryResults: normalized, dqCategories: dq, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchByTag: async (matchId) => {
    set({ loading: true, error: null });
    try {
      const data = await api.getTagResults(matchId);
      const dq = (data.dq || []).map(normalizeNumericFields);
      const { dq: _dq, ...tagData } = data;
      const normalized: Record<string, Record<string, any[]>> = {};
      for (const [tag, divisions] of Object.entries(tagData)) {
        normalized[tag] = {};
        for (const [div, rows] of Object.entries(divisions as Record<string, any[]>)) {
          normalized[tag][div] = rows.map(normalizeNumericFields);
        }
      }
      set({ tagResults: normalized, dqTags: dq, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchShooterStageSummaries: async (matchId, registrationId) => {
    set({ shooterSummaryLoading: true });
    try {
      const data = await api.getShooterStageSummaries(matchId, registrationId);
      set({ shooterSummary: data, shooterSummaryLoading: false });
    } catch (err: any) {
      set({ shooterSummary: null, shooterSummaryLoading: false });
    }
  },

  clearShooterSummary: () => set({ shooterSummary: null }),
}));

export type { OverallResult, DqShooter, DqStageShooter, StageResultGroup };