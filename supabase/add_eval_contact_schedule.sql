-- ============================================================
-- Evaluation contact + schedule confirmation (ADDITIVE).
-- contact_phone: the owner's number, captured at booking so the trainer can
--   call to confirm the location.
-- schedule_confirmed: the trainer proposes an evaluation time; the owner
--   confirms it in the app. Defaults false (unconfirmed) when a time is set.
-- Run in Supabase SQL Editor. Rollback: rollback_eval_contact_schedule.sql
-- ============================================================

ALTER TABLE public.trainer_evaluations ADD COLUMN IF NOT EXISTS contact_phone      text;
ALTER TABLE public.trainer_evaluations ADD COLUMN IF NOT EXISTS schedule_confirmed boolean NOT NULL DEFAULT false;
