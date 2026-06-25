-- Scorer trust: global token + per-device sessions
-- Replaces per-stage passwords and stage_link_tokens.

-- Drop legacy per-stage auth tables
DROP TABLE IF EXISTS stage_sessions CASCADE;
DROP TABLE IF EXISTS stage_link_tokens CASCADE;

-- Drop per-stage password columns
ALTER TABLE stages DROP COLUMN IF EXISTS password_hash;
ALTER TABLE stages DROP COLUMN IF EXISTS password;

-- Scorer sessions: one row per device, long-lived until admin rotates trust token
CREATE TABLE scorer_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  trust_token   TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  device_label  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scorer_sessions_token ON scorer_sessions(session_token);
CREATE INDEX idx_scorer_sessions_trust ON scorer_sessions(match_id, trust_token);

-- Global trust token (empty string = no trust issued yet)
INSERT INTO app_settings (key, value, updated_at)
VALUES ('scorer_trust_token', '', now())
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, updated_at)
VALUES ('scorer_trust_token_rotated_at', '', now())
ON CONFLICT (key) DO NOTHING;
