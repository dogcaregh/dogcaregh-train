-- ============================================================
-- CLEAR ALL TRAINERS (DESTRUCTIVE — IRREVERSIBLE).
-- Wipes every trainer_profiles row (demo AND real signups) and ALL dependent
-- marketplace data: programs, evaluations, recommendations, bookings, sessions,
-- reviews, cash-outs, and trainer<->owner messages. This necessarily also
-- clears owners' bookings/evaluations, since those are inseparable from the
-- trainers being removed.
--
-- Does NOT delete user accounts (public.users / auth.users) — only their trainer
-- data. Does NOT touch the shared DogCareGH tables or the care app.
-- Notifications and uploaded trainer photos are left as-is (harmless orphans);
-- see the optional block at the bottom if you want those gone too.
--
-- Deletes run child-first so they succeed regardless of ON DELETE behaviour.
-- Wrapped in a transaction: nothing is removed unless the whole thing succeeds.
-- Run in Supabase Dashboard → SQL Editor. TAKE A BACKUP FIRST if unsure.
-- ============================================================

BEGIN;

-- Sessions belong to bookings.
DELETE FROM public.trainer_sessions;
-- Reviews belong to bookings + trainers.
DELETE FROM public.trainer_reviews;
-- Bookings reference recommendations + programs + trainers → delete before them.
DELETE FROM public.trainer_bookings;
-- Recommendations reference evaluations + trainers.
DELETE FROM public.trainer_recommendations;
-- Cash-outs + messages hang off trainers.
DELETE FROM public.trainer_cashout_requests;
DELETE FROM public.trainer_messages;
-- Evaluations reference programs + trainers.
DELETE FROM public.trainer_evaluations;
-- Programs belong to trainers.
DELETE FROM public.trainer_programs;
-- Finally the trainer profiles themselves.
DELETE FROM public.trainer_profiles;

COMMIT;

-- Verify everything is empty (all counts should be 0).
SELECT
  (SELECT count(*) FROM public.trainer_profiles)        AS profiles,
  (SELECT count(*) FROM public.trainer_programs)        AS programs,
  (SELECT count(*) FROM public.trainer_evaluations)     AS evaluations,
  (SELECT count(*) FROM public.trainer_recommendations) AS recommendations,
  (SELECT count(*) FROM public.trainer_bookings)        AS bookings,
  (SELECT count(*) FROM public.trainer_sessions)        AS sessions,
  (SELECT count(*) FROM public.trainer_reviews)         AS reviews,
  (SELECT count(*) FROM public.trainer_cashout_requests) AS cashouts,
  (SELECT count(*) FROM public.trainer_messages)        AS messages;

-- ── OPTIONAL: also clear notifications (they reference user_id, not trainers,
-- so they don't cascade; some will now link to deleted bookings). Uncomment to run:
-- DELETE FROM public.trainer_notifications;

-- ── OPTIONAL: reset the is_trainer flag on affected users (cosmetic). Uncomment:
-- UPDATE public.users SET is_trainer = false WHERE is_trainer = true;
