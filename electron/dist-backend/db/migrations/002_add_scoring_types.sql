-- Migration 002: Add new scoring types and supporting columns

-- 1. Expand scoring_type CHECK constraint on stages
ALTER TABLE stages DROP CONSTRAINT stages_scoring_type_check;
ALTER TABLE stages ADD CONSTRAINT stages_scoring_type_check
  CHECK (scoring_type IN (
    'comstock', 'virginia', 'fixed_time', 'chrono',
    'hit_factor', 'idpa', 'action_steel', 'multi_gun',
    'long_range', 'bullseye', 'archery', 'nrl22'
  ));

-- 2. Add JSONB config column for type-specific stage settings
-- Examples:
--   action_steel: { "number_of_strings": 5, "targets_per_string": 5, "drop_worst": 1 }
--   bullseye: { "fire_type": "slow", "shots_per_string": 10 }
--   long_range: { "variant": "prs" }  or "f_class"
--   nrl22: { "point_value": 10 }
--   multi_gun: { "num_targets": 8, "has_no_shoot": true }
--   archery: { "arrows_per_end": 6 }
ALTER TABLE stages ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- 3. Add JSONB score_data column for type-specific score data
-- Examples:
--   action_steel: { "string_times": [5.23, 4.87, ...], "string_plate_hits": [[true,false,...], ...] }
--   idpa: { "penalty_pe": 0, "penalty_hnt": 0, "penalty_ftn": 0, "penalty_fp": 0, "penalty_ftdr": 0 }
--   multi_gun: { "penalty_ftn_sec": 0, "penalty_miss_sec": 0, "penalty_no_shoot_sec": 0, "penalty_procedural_sec": 0 }
ALTER TABLE stage_scores ADD COLUMN IF NOT EXISTS score_data JSONB DEFAULT '{}';

-- 4. Add JSONB target_data column for type-specific per-target data
-- Examples:
--   bullseye/archery/f_class: { "ring_values": [10, 9, 8, ...] }  (11=X, 10, 9, ..., 0=miss)
--   multi_gun: { "neutralized": true }
--   nrl22/prs: { "hit": true }
ALTER TABLE target_scores ADD COLUMN IF NOT EXISTS target_data JSONB DEFAULT '{}';

-- 5. Add x_count for ring-based tiebreaking (bullseye, archery, f_class)
ALTER TABLE stage_scores ADD COLUMN IF NOT EXISTS x_count INT DEFAULT 0;

-- 6. Add total_time for time-based types (idpa, action_steel, multi_gun)
ALTER TABLE stage_scores ADD COLUMN IF NOT EXISTS total_time DECIMAL(8,2);

-- 7. Expand organization CHECK constraint on matches
ALTER TABLE matches DROP CONSTRAINT matches_organization_check;
ALTER TABLE matches ADD CONSTRAINT matches_organization_check
  CHECK (organization IN ('IPSC', 'USPSA', 'IDPA', '3GUN', 'NRL22', 'PRS', 'NRA', 'USA_ARCHERY'));

-- 8. Expand division CHECK constraint on shooters
ALTER TABLE shooters DROP CONSTRAINT shooters_division_check;
ALTER TABLE shooters ADD CONSTRAINT shooters_division_check
  CHECK (division IN (
    'standard', 'open', 'production', 'production_optics', 'classic', 'revolver', 'pcc_optics', 'pcc_iron',
    'ssp', 'esp', 'cdp', 'ccp', 'bug', 'revolver_idpa',
    'tactical', 'open_3gun', 'heavy',
    'open_prs', 'production_prs',
    'any', 'irons', 'open_22',
    'conventional', 'international'
  ));

-- 9. Expand division CHECK constraint on match_registrations
ALTER TABLE match_registrations DROP CONSTRAINT match_registrations_division_check;
ALTER TABLE match_registrations ADD CONSTRAINT match_registrations_division_check
  CHECK (division IN (
    'standard', 'open', 'production', 'production_optics', 'classic', 'revolver', 'pcc_optics', 'pcc_iron',
    'ssp', 'esp', 'cdp', 'ccp', 'bug', 'revolver_idpa',
    'tactical', 'open_3gun', 'heavy',
    'open_prs', 'production_prs',
    'any', 'irons', 'open_22',
    'conventional', 'international'
  ));

-- 10. Expand firearm_type CHECK constraint on matches
ALTER TABLE matches DROP CONSTRAINT matches_firearm_type_check;
ALTER TABLE matches ADD CONSTRAINT matches_firearm_type_check
  CHECK (firearm_type IN ('handgun', 'rifle', 'pcc', 'shotgun', 'combined', 'bow'));