-- Admin authentication: password storage and session management
-- Allows admin users to log in with a password instead of IP-based auto-auth

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default empty admin password hash (empty = use default password 'admin')
INSERT INTO app_settings (key, value) VALUES ('admin_password_hash', '')
ON CONFLICT (key) DO NOTHING;