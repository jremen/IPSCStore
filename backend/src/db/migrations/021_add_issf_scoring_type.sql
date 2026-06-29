-- Migration 021: Add ISSF Smallbore scoring type and organization

-- 1. Expand scoring_type CHECK to include 'issf'
ALTER TABLE stages DROP CONSTRAINT stages_scoring_type_check;
ALTER TABLE stages ADD CONSTRAINT stages_scoring_type_check
  CHECK (scoring_type IN (
    'comstock', 'virginia', 'fixed_time', 'chrono',
    'hit_factor', 'idpa', 'action_steel', 'multi_gun',
    'long_range', 'bullseye', 'archery', 'nrl22', 'issf'
  ));

-- 2. Expand organization CHECK to include 'ISSF'
ALTER TABLE matches DROP CONSTRAINT matches_organization_check;
ALTER TABLE matches ADD CONSTRAINT matches_organization_check
  CHECK (organization IN ('IPSC', 'USPSA', 'IDPA', '3GUN', 'NRL22', 'PRS', 'NRA', 'USA_ARCHERY', 'ISSF'));
