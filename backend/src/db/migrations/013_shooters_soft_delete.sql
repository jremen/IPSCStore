-- Add soft-delete support to shooters table.
-- Instead of hard-deleting, set deleted_at to NOW().
-- Soft-deleted shooters remain in match registrations, scores, and results,
-- but are hidden from the global shooter database list.

ALTER TABLE shooters ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial index for active (non-deleted) shooters — used by the shooter list query
CREATE INDEX IF NOT EXISTS idx_shooters_active ON shooters (last_name, first_name) WHERE deleted_at IS NULL;