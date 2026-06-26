import type { Division, Category, PowerFactor } from './shooter';

export interface OverallResult {
  registration_id: string;
  first_name: string;
  last_name: string;
  division: Division;
  category: Category;
  power_factor: PowerFactor;
  tag: string | null;
  is_dq: boolean;
  match_points: number;
  match_percent: number;
  position: number;
}

export interface StageResult {
  registration_id: string;
  first_name: string;
  last_name: string;
  division: Division;
  hit_factor: number;
  net_points: number;
  stage_percent: number;
  stage_points: number;
  time: number | null;
  position: number;
  division_position?: number;
}

export interface StageResultGroup {
  stage_id: string;
  stage_number: number;
  stage_name: string;
  scores: StageResult[];
}

export interface CSVImportResult {
  imported: number;
  updated?: number;
  skipped: number;
  errors: string[];
}

// ── Hit/penalty aggregate types ──────────────────────────────────────

export interface ShooterAggregates {
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot: number;
  total_time: number;
  x_count: number;
}

export interface ShooterSummaryTarget {
  target_index: number;
  target_type: string;
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot_hits: number;
  steel_hit: boolean | null;
  target_data?: any;
}

export interface ShooterSummaryStage {
  id: string;
  stage_number: number;
  name: string;
  scoring_type: string;
  paper_targets: number;
  steel_targets: number;
  no_shoot_targets: number;
  npm_targets: number;
  hits_per_paper: number;
  min_rounds: number;
  max_points: number;
  par_time: number | null;
  briefing: string | null;
  config: any;
}

export interface ShooterSummaryScore {
  time: number | null;
  raw_points: number;
  penalty_points: number;
  net_points: number;
  hit_factor: number;
  stage_percent: number;
  stage_points: number;
  total_time: number | null;
  x_count: number;
  procedural_count: number;
  ftsa_count: number;
  extra_shot_count: number;
  extra_hit_count: number;
  stacking_count: number;
  overtime_shot_count: number;
  is_dnf: boolean;
  score_data?: any;
  targets: ShooterSummaryTarget[];
}

export interface ShooterStageSummaryItem {
  stage: ShooterSummaryStage;
  score: ShooterSummaryScore;
}

export interface ShooterStageSummariesResponse {
  registration: {
    first_name: string;
    last_name: string;
    division: string;
    category: string;
    power_factor: string;
    is_dq: boolean;
  };
  stages: ShooterStageSummaryItem[];
}
