-- Rollback trainer region. Run in Supabase SQL Editor.
ALTER TABLE public.trainer_profiles DROP COLUMN IF EXISTS region;
