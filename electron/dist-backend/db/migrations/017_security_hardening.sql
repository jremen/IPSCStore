-- Security hardening: rate limiting, audit log, session epoch, stage sessions tracking

-- Rate limiting table for auth attempts
CREATE TABLE IF NOT EXISTS auth_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('admin', 'stage')),
  key TEXT NOT NULL,          -- IP address or IP+stageId
  ok BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_kind_key_time ON auth_attempts (kind, key, attempted_at);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'scorer', 'anonymous')),
  actor_token_id TEXT,        -- first 8 chars of token for debugging
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  ip TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_action_time ON audit_log (action, at);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log (target_table, target_id);

-- Session epoch for invalidating all sessions on password change
INSERT INTO app_settings (key, value, updated_at)
VALUES ('session_epoch', '0', now())
ON CONFLICT (key) DO NOTHING;

-- Add last_used_at to stage_sessions for sweeping unused tokens
ALTER TABLE stage_sessions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
