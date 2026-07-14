-- ============================================================
-- Stable session numbering (ADDITIVE). Sessions were numbered by array
-- position, which shifts when a session is scheduled/completed — so marking
-- "Session 1" complete could renumber the list. Give each session a fixed
-- `seq` set at creation and display in that order forever.
-- Run in Supabase SQL Editor. Rollback: rollback_session_sequence.sql
-- ============================================================

ALTER TABLE public.trainer_sessions ADD COLUMN IF NOT EXISTS seq int;

-- Backfill existing sessions: number them per booking in schedule order
-- (earliest scheduled = Session 1; unscheduled fall to the end), which matches
-- how owners/trainers already read their programs.
WITH ordered AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY booking_id
           ORDER BY scheduled_at ASC NULLS LAST, id
         ) AS rn
  FROM public.trainer_sessions
)
UPDATE public.trainer_sessions s
SET seq = o.rn
FROM ordered o
WHERE s.id = o.id AND s.seq IS NULL;
