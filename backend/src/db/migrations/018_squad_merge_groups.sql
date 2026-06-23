-- Squad merge groups: add group_id column to match_registrations
-- Groups are per-match: two registrations are in the same group iff they share group_id within the same match.

ALTER TABLE match_registrations
  ADD COLUMN IF NOT EXISTS group_id UUID;

CREATE INDEX IF NOT EXISTS idx_registrations_group
  ON match_registrations(match_id, group_id) WHERE group_id IS NOT NULL;
