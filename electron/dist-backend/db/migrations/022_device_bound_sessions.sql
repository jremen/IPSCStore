-- Device-bound scorer sessions
-- Adds per-device binding to the existing scorer_sessions table
-- and a settings toggle for approval mode (silent | pending).

ALTER TABLE scorer_sessions ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE scorer_sessions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- One device per match — if a device resubmits the trust token, it updates the existing row
CREATE UNIQUE INDEX IF NOT EXISTS idx_scorer_sessions_device_id
  ON scorer_sessions(match_id, device_id)
  WHERE device_id IS NOT NULL;

-- Device approval mode: 'silent' = auto-approve on first scan, 'pending' = requires admin approval
INSERT INTO app_settings (key, value, updated_at)
VALUES ('scorer_device_mode', 'silent', now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;
