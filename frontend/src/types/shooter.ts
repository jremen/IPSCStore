export type Category = 'regular' | 'junior' | 'senior' | 'super_senior' | 'lady';
export type Division = 'standard' | 'open' | 'production' | 'production_optics' | 'classic' | 'revolver' | 'pcc_optics' | 'pcc_iron';
export type PowerFactor = 'minor' | 'major';

export interface Shooter {
  id: string;
  first_name: string;
  last_name: string;
  category: Category;
  tag: string | null;
  division: Division;
  power_factor: PowerFactor;
  region: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateShooterInput {
  first_name: string;
  last_name: string;
  category: Category;
  tag?: string | null;
  division: Division;
  power_factor: PowerFactor;
  region: string;
  email?: string | null;
}