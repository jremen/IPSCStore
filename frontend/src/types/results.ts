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
  skipped: number;
  errors: string[];
}