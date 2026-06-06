-- Add is_current column to matches table.
-- Only one match can be "current" at a time — the active match for the event.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT false;

-- Ensure at most one match is current at a time
CREATE UNIQUE INDEX IF NOT EXISTS matches_is_current_true
  ON matches ((true)) WHERE is_current = true;