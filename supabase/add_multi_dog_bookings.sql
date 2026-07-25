-- ============================================================
-- Multi-dog evaluations + per-dog services (ADDITIVE).
-- One evaluation can cover several dogs at a single fee; a booked service
-- reflects each dog's fee, with an optional trainer multi-dog discount.
-- Keeps the existing single `dog_id` as the PRIMARY dog (backward compatible)
-- and adds `dog_ids[]` holding the full set. Run in Supabase SQL Editor.
-- Rollback: supabase/rollback_multi_dog_bookings.sql
-- ============================================================

-- Full dog set on evaluations + bookings (the primary dog stays in dog_id).
ALTER TABLE public.trainer_evaluations ADD COLUMN IF NOT EXISTS dog_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.trainer_bookings    ADD COLUMN IF NOT EXISTS dog_ids uuid[] NOT NULL DEFAULT '{}';

-- Trainer's multi-dog discount (%), applied once 2+ dogs are on a service.
ALTER TABLE public.trainer_profiles ADD COLUMN IF NOT EXISTS multi_dog_discount numeric(5,2) NOT NULL DEFAULT 0
  CHECK (multi_dog_discount >= 0 AND multi_dog_discount <= 100);

-- Backfill existing rows: the single dog becomes the sole member of the set.
UPDATE public.trainer_evaluations SET dog_ids = ARRAY[dog_id]
  WHERE dog_id IS NOT NULL AND array_length(dog_ids, 1) IS NULL;
UPDATE public.trainer_bookings SET dog_ids = ARRAY[dog_id]
  WHERE dog_id IS NOT NULL AND array_length(dog_ids, 1) IS NULL;

-- Extend the trainer dog-read policy so a trainer can see EVERY dog on their
-- engagements, not just the primary dog_id. Mirrors add_trainer_dog_access.sql;
-- owners' own "dogs: owners manage their dogs" policy is untouched.
DROP POLICY IF EXISTS "dogs: trainers read via engagements" ON public.dogs;
CREATE POLICY "dogs: trainers read via engagements"
  ON public.dogs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_evaluations e
      JOIN public.trainer_profiles tp ON tp.id = e.trainer_id
      WHERE tp.user_id = auth.uid()
        AND (e.dog_id = dogs.id OR dogs.id = ANY(e.dog_ids))
    )
    OR EXISTS (
      SELECT 1 FROM public.trainer_bookings b
      JOIN public.trainer_profiles tp ON tp.id = b.trainer_id
      WHERE tp.user_id = auth.uid()
        AND (b.dog_id = dogs.id OR dogs.id = ANY(b.dog_ids))
    )
  );
