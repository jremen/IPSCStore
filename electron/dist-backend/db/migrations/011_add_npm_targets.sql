-- Add NPM (Non-Penalty Miss) targets to stages
-- NPM targets are optional steel targets: hit = +5 bonus points, miss = no penalty
ALTER TABLE stages ADD COLUMN npm_targets INT NOT NULL DEFAULT 0 CHECK (npm_targets >= 0);

-- Allow 'npm' as a target_type in target_scores
ALTER TABLE target_scores DROP CONSTRAINT target_scores_target_type_check;
ALTER TABLE target_scores ADD CONSTRAINT target_scores_target_type_check
  CHECK (target_type IN ('paper', 'steel', 'no_shoot', 'npm'));