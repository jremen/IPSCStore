-- Stage passwords for remote scorer authentication
-- Each stage can optionally have a password that remote mobile users must enter
-- to access the scoring interface for that stage.

-- Add password column to stages (nullable = no auth required)
ALTER TABLE stages ADD COLUMN password TEXT;

-- Create stage_sessions table for authenticated remote users
CREATE TABLE stage_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_stage_sessions_token ON stage_sessions(token);
CREATE INDEX idx_stage_sessions_stage ON stage_sessions(stage_id);