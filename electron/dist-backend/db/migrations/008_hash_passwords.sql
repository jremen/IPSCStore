-- Migrate from plain-text stage passwords to bcrypt-hashed passwords.
-- Adds a password_hash column; existing plain-text passwords are migrated
-- by the backend startup hook (Node.js bcrypt.hash), then the old column
-- is dropped in migration 009.

-- Add password_hash column (nullable = no auth required for that stage)
ALTER TABLE stages ADD COLUMN password_hash TEXT;