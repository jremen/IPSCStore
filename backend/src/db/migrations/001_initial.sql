-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  organization VARCHAR(10) NOT NULL CHECK (organization IN ('IPSC', 'USPSA')),
  firearm_type VARCHAR(20) NOT NULL CHECK (firearm_type IN ('handgun', 'rifle', 'pcc', 'shotgun')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date DESC);

-- Stages
CREATE TABLE IF NOT EXISTS stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  stage_number INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  scoring_type VARCHAR(20) NOT NULL CHECK (scoring_type IN ('comstock', 'virginia', 'fixed_time', 'chrono')),
  paper_targets INT NOT NULL DEFAULT 0 CHECK (paper_targets >= 0),
  steel_targets INT NOT NULL DEFAULT 0 CHECK (steel_targets >= 0),
  no_shoot_targets INT NOT NULL DEFAULT 0 CHECK (no_shoot_targets >= 0),
  hits_per_paper INT NOT NULL DEFAULT 2 CHECK (hits_per_paper >= 1),
  min_rounds INT NOT NULL CHECK (min_rounds >= 0),
  max_points DECIMAL(8,2) NOT NULL,
  par_time DECIMAL(6,2),
  image_path VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, stage_number)
);
CREATE INDEX IF NOT EXISTS idx_stages_match ON stages(match_id);

-- Shooters
CREATE TABLE IF NOT EXISTS shooters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('regular', 'junior', 'senior', 'super_senior', 'lady')),
  tag VARCHAR(100),
  division VARCHAR(20) NOT NULL CHECK (division IN (
    'standard', 'open', 'production', 'production_optics',
    'classic', 'revolver', 'pcc_optics', 'pcc_iron'
  )),
  power_factor VARCHAR(10) NOT NULL CHECK (power_factor IN ('minor', 'major')),
  region VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shooters_name ON shooters(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_shooters_tag ON shooters(tag) WHERE tag IS NOT NULL;

-- Match Registrations
CREATE TABLE IF NOT EXISTS match_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  shooter_id UUID NOT NULL REFERENCES shooters(id) ON DELETE RESTRICT,
  squad INT,
  division VARCHAR(20) CHECK (division IN (
    'standard', 'open', 'production', 'production_optics',
    'classic', 'revolver', 'pcc_optics', 'pcc_iron'
  )),
  category VARCHAR(20) CHECK (category IN ('regular', 'junior', 'senior', 'super_senior', 'lady')),
  power_factor VARCHAR(10) CHECK (power_factor IN ('minor', 'major')),
  is_dq BOOLEAN NOT NULL DEFAULT FALSE,
  dq_reason TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, shooter_id)
);
CREATE INDEX IF NOT EXISTS idx_registrations_match ON match_registrations(match_id);
CREATE INDEX IF NOT EXISTS idx_registrations_shooter ON match_registrations(shooter_id);
CREATE INDEX IF NOT EXISTS idx_registrations_squad ON match_registrations(match_id, squad);

-- Stage Scores
CREATE TABLE IF NOT EXISTS stage_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES match_registrations(id) ON DELETE CASCADE,
  time DECIMAL(8,2),
  extra_shot_count INT NOT NULL DEFAULT 0 CHECK (extra_shot_count >= 0),
  extra_hit_count INT NOT NULL DEFAULT 0 CHECK (extra_hit_count >= 0),
  stacking_count INT NOT NULL DEFAULT 0 CHECK (stacking_count >= 0),
  overtime_shot_count INT NOT NULL DEFAULT 0 CHECK (overtime_shot_count >= 0),
  procedural_count INT NOT NULL DEFAULT 0 CHECK (procedural_count >= 0),
  ftsa_count INT NOT NULL DEFAULT 0 CHECK (ftsa_count >= 0),
  is_dnf BOOLEAN NOT NULL DEFAULT FALSE,
  raw_points DECIMAL(8,2) NOT NULL DEFAULT 0,
  penalty_points DECIMAL(8,2) NOT NULL DEFAULT 0,
  net_points DECIMAL(8,2) NOT NULL DEFAULT 0,
  hit_factor DECIMAL(10,4) NOT NULL DEFAULT 0,
  stage_percent DECIMAL(8,4) NOT NULL DEFAULT 0,
  stage_points DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stage_id, registration_id)
);
CREATE INDEX IF NOT EXISTS idx_scores_stage ON stage_scores(stage_id);
CREATE INDEX IF NOT EXISTS idx_scores_registration ON stage_scores(registration_id);
CREATE INDEX IF NOT EXISTS idx_scores_match ON stage_scores(match_id);

-- Target Scores
CREATE TABLE IF NOT EXISTS target_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_score_id UUID NOT NULL REFERENCES stage_scores(id) ON DELETE CASCADE,
  target_index INT NOT NULL CHECK (target_index >= 1),
  target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('paper', 'steel', 'no_shoot')),
  alpha INT NOT NULL DEFAULT 0 CHECK (alpha >= 0),
  charlie INT NOT NULL DEFAULT 0 CHECK (charlie >= 0),
  delta INT NOT NULL DEFAULT 0 CHECK (delta >= 0),
  miss INT NOT NULL DEFAULT 0 CHECK (miss >= 0),
  no_shoot_hits INT NOT NULL DEFAULT 0 CHECK (no_shoot_hits >= 0),
  steel_hit BOOLEAN,
  UNIQUE(stage_score_id, target_index)
);
CREATE INDEX IF NOT EXISTS idx_target_scores_stage_score ON target_scores(stage_score_id);

-- Chrono Results
CREATE TABLE IF NOT EXISTS chrono_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_score_id UUID NOT NULL REFERENCES stage_scores(id) ON DELETE CASCADE,
  bullet_weight DECIMAL(6,1) NOT NULL,
  velocity_1 DECIMAL(6,1),
  velocity_2 DECIMAL(6,1),
  velocity_3 DECIMAL(6,1),
  avg_velocity DECIMAL(6,1),
  calculated_pf DECIMAL(6,2),
  pf_passed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stage_score_id)
);