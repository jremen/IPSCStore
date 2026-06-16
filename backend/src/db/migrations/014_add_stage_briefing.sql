-- Add stage briefing (written stage description) to stages table.
-- Used by the range master to record starting position, procedure notes, and
-- other written instructions. Shown to remote scorers via the stage details
-- modal in the scoring view.

ALTER TABLE stages ADD COLUMN IF NOT EXISTS briefing TEXT;
