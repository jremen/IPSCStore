-- Add WinMSS MemberId column for proper dedup on re-import
-- Without this, shooters with the same name but different MemberIds are incorrectly merged
ALTER TABLE shooters ADD COLUMN IF NOT EXISTS winmss_member_id INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS idx_shooters_winmss_member_id ON shooters (winmss_member_id) WHERE winmss_member_id IS NOT NULL;