-- Rollback trainer contact fields. Run in Supabase SQL Editor.
ALTER TABLE public.trainer_profiles DROP COLUMN IF EXISTS phone;
ALTER TABLE public.trainer_profiles DROP COLUMN IF EXISTS location;
