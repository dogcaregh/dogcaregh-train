-- ============================================================
-- Trainer region (ADDITIVE). Pairs with the existing `location` column
-- (now the neighbourhood) to form a region + neighbourhood address. GPS is
-- derived in-app from lib/locations.ts, so no coordinate columns are needed.
-- Run in Supabase SQL Editor. Rollback: rollback_trainer_region.sql
-- ============================================================

ALTER TABLE public.trainer_profiles ADD COLUMN IF NOT EXISTS region text;
