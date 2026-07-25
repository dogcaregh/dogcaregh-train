-- Rollback evaluation contact + schedule confirmation. Run in Supabase SQL Editor.
ALTER TABLE public.trainer_evaluations DROP COLUMN IF EXISTS contact_phone;
ALTER TABLE public.trainer_evaluations DROP COLUMN IF EXISTS schedule_confirmed;
