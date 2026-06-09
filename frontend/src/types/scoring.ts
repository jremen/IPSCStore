import type { PowerFactor, Division, Category } from './shooter';

export interface TargetScore {
  target_index: number;
  target_type: 'paper' | 'steel' | 'no_shoot' | 'npm';
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot_hits: number;
  steel_hit: boolean | null;
  // Type-specific per-target data
  target_data?: {
    neutralized?: boolean;       // multi_gun
    hit?: boolean;               // nrl22, prs
    ring_values?: number[];      // bullseye, archery, f_class (11=X, 10, 9, ..., 0=miss)
  };
}

export interface StageScore {
  id: string;
  match_id: string;
  stage_id: string;
  registration_id: string;
  time: number | null;
  extra_shot_count: number;
  extra_hit_count: number;
  stacking_count: number;
  overtime_shot_count: number;
  procedural_count: number;
  ftsa_count: number;
  is_dnf: boolean;
  raw_points: number;
  penalty_points: number;
  net_points: number;
  hit_factor: number;
  stage_percent: number;
  stage_points: number;
  // Type-specific score data
  total_time?: number | null;     // idpa, action_steel, multi_gun
  x_count?: number;               // bullseye, archery, f_class
  score_data?: ScoreData;
}

export interface ScoreData {
  // IDPA penalties
  penalty_pe?: number;
  penalty_hnt?: number;
  penalty_ftn?: number;
  penalty_fp?: number;
  penalty_ftdr?: number;
  // Action Steel strings
  string_times?: number[];
  string_plate_hits?: boolean[][];
  // Multi-Gun penalty seconds
  penalty_ftn_sec?: number;
  penalty_miss_sec?: number;
  penalty_no_shoot_sec?: number;
  penalty_procedural_sec?: number;
  // Ring-based
  ring_values?: number[];
  // Hit-count
  hit_count?: number;
}

export interface StageScoreWithTargets extends StageScore {
  targets: TargetScore[];
  chrono?: ChronoData | null;
}

export interface ChronoData {
  bullet_weight: number;
  velocity_1: number | null;
  velocity_2: number | null;
  velocity_3: number | null;
  avg_velocity: number;
  calculated_pf: number;
  pf_passed: boolean;
}

export interface ScoringAlert {
  type: 'warning' | 'error';
  message: string;
}

export interface RegistrationWithShooter {
  id: string;
  shooter_id: string;
  first_name: string;
  last_name: string;
  category: Category;
  tag: string | null;
  division: Division;
  power_factor: PowerFactor;
  region: string;
  email: string | null;
  squad: number | null;
  reg_division: Division | null;
  reg_category: Category | null;
  reg_power_factor: PowerFactor | null;
  is_dq: boolean;
  dq_reason: string | null;
  effective_division: Division;
  effective_category: Category;
  effective_power_factor: PowerFactor;
}

export interface ScoringProgressEntry {
  stage_id: string;
  registration_id: string;
  squad: number | null;
}

export interface ScoringProgress {
  scored: ScoringProgressEntry[];
}

export interface ScoreInput {
  time: number | null;
  targets: TargetScore[];
  procedural_count: number;
  ftsa_count: number;
  extra_shot_count: number;
  extra_hit_count: number;
  stacking_count: number;
  overtime_shot_count: number;
  is_dnf: boolean;
  chrono?: ChronoData | null;
  // Type-specific score data
  score_data?: ScoreData;
}