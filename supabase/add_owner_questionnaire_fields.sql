-- ============================================================
-- ADDITIVE — owner questionnaire dog fields on trainer_owner_profiles
-- The matching engine ranks trainers partly by breed experience, so the
-- owner intake needs the dog's breed (and name for display). Nullable,
-- safe. Run in Supabase Dashboard → SQL Editor.
-- Rollback:
--   ALTER TABLE public.trainer_owner_profiles DROP COLUMN IF EXISTS dog_breed;
--   ALTER TABLE public.trainer_owner_profiles DROP COLUMN IF EXISTS dog_name;
-- ============================================================

ALTER TABLE public.trainer_owner_profiles ADD COLUMN IF NOT EXISTS dog_name  text;
ALTER TABLE public.trainer_owner_profiles ADD COLUMN IF NOT EXISTS dog_breed text;
