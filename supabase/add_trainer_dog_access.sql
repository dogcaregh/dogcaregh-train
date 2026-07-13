-- ============================================================
-- ADDITIVE — let trainers read the dog attached to their engagements.
-- Bookings/evaluations are per-dog (dog_id -> public.dogs, the SHARED
-- DogCareGH dogs table). Owners already manage their own dogs via the
-- existing "dogs: owners manage their dogs" policy (auth.uid()=owner_id),
-- which works from the trainer app too (same auth). This ADDS a read-only
-- policy so a trainer can see the dog for an evaluation/booking sent to
-- them. Existing dogs policies are untouched.
-- Run in Supabase Dashboard → SQL Editor.
-- Rollback: DROP POLICY IF EXISTS "dogs: trainers read via engagements" ON public.dogs;
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
