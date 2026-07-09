-- Stage link tokens: single-use short-lived tokens for auto-login via QR codes.
-- Admin mints tokens; range officers redeem them via /scoring?stageToken=...

CREATE TABLE stage_link_tokens (
  id          TEXT PRIMARY KEY,                -- 32-byte random hex (256 bits)
  match_id    UUID NOT NULL,
  stage_id    UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  created_by  TEXT,                             -- admin session token (nullable)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,                     -- NULL until redeemed
  redeemed_ip TEXT,
  revoked_at  TIMESTAMPTZ                      -- NULL until revoked
);

CREATE INDEX idx_stage_link_tokens_stage ON stage_link_tokens(stage_id);
CREATE INDEX idx_stage_link_tokens_expires ON stage_link_tokens(expires_at);
CREATE INDEX idx_stage_link_tokens_match ON stage_link_tokens(match_id);
