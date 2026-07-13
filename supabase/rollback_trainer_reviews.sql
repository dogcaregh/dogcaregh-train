-- Rollback for add_trainer_reviews.sql
DROP TRIGGER IF EXISTS trg_update_trainer_rating ON public.trainer_reviews;
DROP FUNCTION IF EXISTS public.update_trainer_rating();
DROP TABLE IF EXISTS public.trainer_reviews CASCADE;
ALTER TABLE public.trainer_profiles DROP COLUMN IF EXISTS review_count;
ALTER TABLE public.trainer_profiles DROP COLUMN IF EXISTS rating_avg;
