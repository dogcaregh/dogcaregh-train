-- Rollback the discount-model fix. Drops the 0–100 percentage checks (leaving
-- discount unconstrained). It deliberately does NOT restore the legacy
-- CHECK (discount <= price) — that constraint conflated a % with a cedi amount
-- and could reject valid percentage data. Run in Supabase SQL Editor.
ALTER TABLE public.trainer_programs        DROP CONSTRAINT IF EXISTS trainer_programs_discount_pct;
ALTER TABLE public.trainer_recommendations DROP CONSTRAINT IF EXISTS trainer_recommendations_discount_pct;
