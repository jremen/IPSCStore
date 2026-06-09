-- Drop the plain-text password column now that all passwords
-- have been migrated to bcrypt hashes in password_hash.
-- The startup hook in index.ts handles the data migration before this runs.

ALTER TABLE stages DROP COLUMN IF EXISTS password;