-- Enable unaccent extension for diacritic-insensitive search.
-- This extension is "trusted" in PG 13+ so non-superusers can install it.
-- It requires the unaccent shared library to be loadable via dynamic_library_path.
-- Use DO block to make this non-fatal if the extension is not available.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS unaccent;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create unaccent extension: %', SQLERRM;
END
$$;