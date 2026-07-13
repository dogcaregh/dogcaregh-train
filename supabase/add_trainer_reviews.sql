-- ============================================================
-- Phase 4.5 — trainer reviews & ratings (ADDITIVE)
-- Mirrors the care app's reviews table + update_provider_rating trigger.
-- Owners review a trainer after a COMPLETED program (booking closed).
-- Run in Supabase SQL Editor. Rollback: rollback_trainer_reviews.sql
-- ============================================================

ALTER TABLE public.trainer_profiles ADD COLUMN IF NOT EXISTS rating_avg   numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5);
ALTER TABLE public.trainer_profiles ADD COLUMN IF NOT EXISTS review_count int          NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.trainer_reviews (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid        NOT NULL UNIQUE REFERENCES public.trainer_bookings(id) ON DELETE CASCADE,
  owner_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trainer_id uuid        NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  rating     smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trainer_reviews_trainer ON public.trainer_reviews (trainer_id);

-- Keep trainer_profiles.rating_avg / review_count in sync.
CREATE OR REPLACE FUNCTION public.update_trainer_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.trainer_profiles
  SET rating_avg   = COALESCE((SELECT round(avg(rating)::numeric, 2) FROM public.trainer_reviews WHERE trainer_id = NEW.trainer_id), 0),
      review_count = (SELECT count(*) FROM public.trainer_reviews WHERE trainer_id = NEW.trainer_id)
  WHERE id = NEW.trainer_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_update_trainer_rating ON public.trainer_reviews;
CREATE TRIGGER trg_update_trainer_rating
  AFTER INSERT OR UPDATE ON public.trainer_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_trainer_rating();

ALTER TABLE public.trainer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trainer_reviews: public read" ON public.trainer_reviews;
CREATE POLICY "trainer_reviews: public read"
  ON public.trainer_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "trainer_reviews: owner insert for completed bookings" ON public.trainer_reviews;
CREATE POLICY "trainer_reviews: owner insert for completed bookings"
  ON public.trainer_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.trainer_bookings b
      WHERE b.id = trainer_reviews.booking_id
        AND b.owner_id = auth.uid()
        AND b.status = 'closed'
    )
  );
