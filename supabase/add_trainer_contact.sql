-- ============================================================
-- Trainer contact fields (ADDITIVE) — phone + location on trainer_profiles.
-- Collected at signup (stored in user_metadata) and on the profile form.
-- Run in Supabase SQL Editor. Rollback: rollback_trainer_contact.sql
-- ============================================================

ALTER TABLE public.trainer_profiles ADD COLUMN IF NOT EXISTS phone    text;
ALTER TABLE public.trainer_profiles ADD COLUMN IF NOT EXISTS location text;
