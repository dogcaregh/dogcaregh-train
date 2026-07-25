-- ============================================================
-- Reconcile the program discount model. `discount` is a PERCENTAGE everywhere
-- in the app (programTotal applies 1 - discount/100), but the tables carried a
-- legacy CHECK (discount <= price) — capping a % by a cedi amount. Replace it
-- with proper percentage bounds (0–100) on both trainer_programs and
-- trainer_recommendations. These are trainer-app tables; the care app is
-- untouched. Run in Supabase SQL Editor. Rollback: rollback_program_discount_constraint.sql
-- ============================================================

-- Drop any legacy CHECK on these tables that relates discount to price.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT rel.relname AS tbl, con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname IN ('trainer_programs', 'trainer_recommendations')
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%discount%'
      AND pg_get_constraintdef(con.oid) ILIKE '%price%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

-- Clamp any legacy out-of-range values into a valid percentage.
UPDATE public.trainer_programs        SET discount = LEAST(GREATEST(discount, 0), 100) WHERE discount < 0 OR discount > 100;
UPDATE public.trainer_recommendations SET discount = LEAST(GREATEST(discount, 0), 100) WHERE discount < 0 OR discount > 100;

-- Proper percentage bounds (idempotent).
ALTER TABLE public.trainer_programs        DROP CONSTRAINT IF EXISTS trainer_programs_discount_pct;
ALTER TABLE public.trainer_programs        ADD  CONSTRAINT trainer_programs_discount_pct        CHECK (discount >= 0 AND discount <= 100);
ALTER TABLE public.trainer_recommendations DROP CONSTRAINT IF EXISTS trainer_recommendations_discount_pct;
ALTER TABLE public.trainer_recommendations ADD  CONSTRAINT trainer_recommendations_discount_pct CHECK (discount >= 0 AND discount <= 100);
