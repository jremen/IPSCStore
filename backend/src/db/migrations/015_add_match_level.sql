-- Add match level (1-5) to matches table.
-- IPSC and USPSA matches have a competition level (1=local, 2=regional, 3=national, 4=continental, 5=world).
-- NULL means not specified.

ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_level INT CHECK (match_level BETWEEN 1 AND 5);
