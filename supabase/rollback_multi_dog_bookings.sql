-- ============================================================
-- Rollback multi-dog bookings. Restores the single-dog trainer read policy
-- (from add_trainer_dog_access.sql) and drops the added columns.
-- Run in Supabase SQL Editor.
-- ============================================================

DROP POLICY IF EXISTS "dogs: trainers read via engagements" ON public.dogs;
CREATE POLICY "dogs: trainers read via engagements"
  ON public.dogs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_evaluations e
      JOIN public.trainer_profiles tp ON tp.id = e.trainer_id
      WHERE e.dog_id = dogs.id AND tp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.trainer_bookings b
      JOIN public.trainer_profiles tp ON tp.id = b.trainer_id
      WHERE b.dog_id = dogs.id AND tp.user_id = auth.uid()
    )
  );

ALTER TABLE public.trainer_profiles    DROP COLUMN IF EXISTS multi_dog_discount;
ALTER TABLE public.trainer_evaluations DROP COLUMN IF EXISTS dog_ids;
ALTER TABLE public.trainer_bookings    DROP COLUMN IF EXISTS dog_ids;
