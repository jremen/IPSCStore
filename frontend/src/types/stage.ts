export type ScoringType =
  | 'comstock' | 'virginia' | 'fixed_time' | 'chrono'
  | 'hit_factor' | 'idpa' | 'action_steel' | 'multi_gun'
  | 'long_range' | 'bullseye' | 'archery' | 'nrl22';

export type StageConfig = {
  // Action Steel
  number_of_strings?: number;      // default 5
  targets_per_string?: number;     // default 5
  drop_worst?: number;             // default 1
  // Bullseye
  fire_type?: 'slow' | 'timed' | 'rapid';
  shots_per_string?: number;       // default 10
  // Long Range
  variant?: 'prs' | 'f_class';    // PRS = hit/miss, F-Class = ring values
  // NRL22
  point_value?: number;            // default 10
  num_targets?: number;            // for multi_gun, nrl22, long_range(prs)
  // Multi-Gun
  has_no_shoot?: boolean;
  // Archery
  arrows_per_end?: number;        // default 6
};

export interface Stage {
  id: string;
  match_id: string;
  stage_number: number;
  name: string;
  scoring_type: ScoringType;
  paper_targets: number;
  steel_targets: number;
  no_shoot_targets: number;
  npm_targets: number;
  hits_per_paper: number;
  min_rounds: number;
  max_points: number;
  par_time: number | null;
  image_path: string | null;
  briefing: string | null;
  config?: StageConfig;
  created_at: string;
  updated_at: string;
}

export interface CreateStageInput {
  name: string;
  scoring_type: ScoringType;
  paper_targets?: number;
  steel_targets?: number;
  no_shoot_targets?: number;
  npm_targets?: number;
  hits_per_paper?: number;
  par_time?: number | null;
  briefing?: string | null;
  config?: StageConfig;
}