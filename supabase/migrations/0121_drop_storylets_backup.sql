-- /supabase/migrations/0121_drop_storylets_backup.sql
-- Drop the orphaned backup table that was blocking the RLS linter.
-- storylets_backup_20260226 is a manual snapshot with no RLS policy.
-- It serves no runtime purpose and should not be exposed via PostgREST.

DROP TABLE IF EXISTS public.storylets_backup_20260226;
