-- ============================================================
-- Remove the demo trainer seed (seed_demo_trainers.sql).
-- Deletes only the fixed-UUID demo rows. trainer_programs and any
-- demo evaluations/bookings cascade from trainer_profiles/users.
-- Run in Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

DELETE FROM public.trainer_profiles WHERE id::text LIKE 'd1000000-%';

SET session_replication_role = 'replica';
DELETE FROM public.users WHERE id::text LIKE 'd0000000-%';
SET session_replication_role = 'origin';

COMMIT;
