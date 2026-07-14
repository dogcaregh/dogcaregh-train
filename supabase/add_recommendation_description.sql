-- ============================================================
-- Recommendations carry "what the program entails" (ADDITIVE).
-- Standard picks copy the program's description; custom builds capture the
-- trainer's own description. Run in Supabase SQL Editor.
-- Rollback: ALTER TABLE public.trainer_recommendations DROP COLUMN IF EXISTS description;
-- ============================================================
ALTER TABLE public.trainer_recommendations ADD COLUMN IF NOT EXISTS description text;
