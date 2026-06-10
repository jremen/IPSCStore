-- Widen organization column to fit 'USA_ARCHERY' (11 chars) which exceeds VARCHAR(10)
ALTER TABLE matches ALTER COLUMN organization TYPE VARCHAR(20);