import type { Stage } from './stage';

export type Organization = 'IPSC' | 'USPSA' | 'IDPA' | '3GUN' | 'NRL22' | 'PRS' | 'NRA' | 'USA_ARCHERY';
export type FirearmType = 'handgun' | 'rifle' | 'pcc' | 'shotgun' | 'combined' | 'bow';
export type MatchLevel = 1 | 2 | 3 | 4 | 5;

export interface Match {
  id: string;
  name: string;
  date: string;
  organization: Organization;
  firearm_type: FirearmType;
  match_level: MatchLevel | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchSummary {
  total_shots: number;
  total_points: number;
  total_paper: number;
  total_steel: number;
  total_no_shoot: number;
}

export interface MatchDetail extends Match {
  stages: Stage[];
  shooter_count: number;
  summary: MatchSummary;
}

export interface CreateMatchInput {
  name: string;
  date: string;
  organization: Organization;
  firearm_type: FirearmType;
  match_level?: MatchLevel | null;
}

// Re-export stage type used in match detail
export type { Stage } from './stage';